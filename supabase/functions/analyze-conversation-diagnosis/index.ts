import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, patient_id, recent_messages } = await req.json();

    if (!conversation_id || !patient_id || !recent_messages?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with caller's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    // Verify user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify patient belongs to user
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing diagnoses
    const { data: existingDiagnoses } = await supabase
      .from('conversation_diagnoses')
      .select('*')
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id)
      .order('updated_at', { ascending: false });

    // Build conversation context for analysis
    const conversationText = recent_messages
      .filter((msg: any) => msg.type === 'user')
      .map((msg: any) => msg.content)
      .join(' ');

    // Get patient context
    const patientAge = patient.date_of_birth 
      ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
Gender: ${patient.gender || 'Not specified'}
Current probable diagnoses: ${existingDiagnoses?.map(d => `${d.diagnosis} (${Math.round(d.confidence * 100)}%)`).join(', ') || 'None'}`;

    const systemPrompt = `You are a medical analysis AI that generates structured diagnosis data based on conversation context. Analyze the conversation and provide potential diagnoses with confidence scores.

PATIENT CONTEXT:
${patientContext}

ANALYSIS INSTRUCTIONS:
- Generate 2-4 potential diagnoses based on the conversation
- Base confidence on evidence strength and symptom specificity
- Use confidence scale 0.3-0.85 (never below 0.3 or above 0.85)
- Consider patient's age, gender, and existing diagnoses
- Focus on most likely conditions that warrant medical discussion
- Provide clear, evidence-based reasoning for each diagnosis

CONFIDENCE SCORING:
- 0.3-0.4: Possible but needs more information
- 0.5-0.6: Moderate likelihood based on symptoms
- 0.7-0.8: Strong evidence supporting this possibility
- 0.85: Very strong evidence (rare, only with clear symptoms)

RESPONSE FORMAT (JSON only):
{
  "diagnoses": [
    {
      "diagnosis": "specific condition name",
      "confidence": 0.65,
      "reasoning": "clear evidence-based justification"
    }
  ]
}

Conversation to analyze: "${conversationText}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this conversation and provide diagnosis suggestions: ${conversationText}` }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let diagnosisData;
    try {
      diagnosisData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and process diagnoses
    const validDiagnoses = (diagnosisData.diagnoses || [])
      .filter((d: any) => d.diagnosis && d.confidence >= 0.3)
      .map((d: any) => ({
        diagnosis: d.diagnosis,
        confidence: Math.min(Math.max(d.confidence, 0.3), 0.85),
        reasoning: d.reasoning || 'No reasoning provided'
      }));

    // Delete existing diagnoses for this conversation
    await supabase
      .from('conversation_diagnoses')
      .delete()
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id);

    // Insert new diagnoses
    if (validDiagnoses.length > 0) {
      const diagnosesToInsert = validDiagnoses.map((d: any) => ({
        conversation_id,
        patient_id,
        user_id: userData.user.id,
        diagnosis: d.diagnosis,
        confidence: d.confidence,
        reasoning: d.reasoning
      }));

      const { error: insertError } = await supabase
        .from('conversation_diagnoses')
        .insert(diagnosesToInsert);

      if (insertError) {
        console.error('Failed to insert diagnoses:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save diagnoses' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnoses: validDiagnoses,
        updated_count: validDiagnoses.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-conversation-diagnosis function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});