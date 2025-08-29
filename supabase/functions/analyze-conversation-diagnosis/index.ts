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

    // Get ALL existing diagnoses to provide complete context
    const { data: existingDiagnoses } = await supabase
      .from('conversation_diagnoses')
      .select('*')
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id)
      .order('updated_at', { ascending: false });
    
    // Separate high-confidence diagnoses to preserve
    const highConfidenceDiagnoses = existingDiagnoses?.filter(d => d.confidence >= 0.7) || [];
    const allExistingDiagnoses = existingDiagnoses || [];

    // Build conversation context for analysis - focus on the current conversation topic
    const conversationText = recent_messages
      .filter((msg: any) => msg.type === 'user')
      .map((msg: any) => msg.content)
      .join(' ');

    console.log('Analyzing conversation text:', conversationText);

    // Only proceed if we have meaningful user input
    if (!conversationText.trim() || conversationText.length < 5) {
      return new Response(
        JSON.stringify({ success: true, diagnoses: [], message: 'Insufficient conversation data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get patient context
    const patientAge = patient.date_of_birth 
      ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const isPet = patient.is_pet === true;
    
    const patientContext = `
${isPet ? 'Pet' : 'Patient'}: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
${isPet ? `Species: ${patient.species || 'Not specified'}` : `Gender: ${patient.gender || 'Not specified'}`}

ALL EXISTING DIAGNOSES (must check against these before creating new ones):
${allExistingDiagnoses.length > 0 
  ? allExistingDiagnoses.map(d => `- "${d.diagnosis}" (confidence: ${Math.round(d.confidence * 100)}%, reasoning: ${d.reasoning})`).join('\n')
  : '- None'}

High-confidence diagnoses (≥70% - MUST preserve): ${highConfidenceDiagnoses?.map(d => `"${d.diagnosis}"`).join(', ') || 'None'}`;

    const systemPrompt = isPet 
      ? `You are a veterinary analysis AI that generates potential diagnoses based on conversation context about pets. You must be strategic about preserving high-confidence diagnoses while analyzing new symptoms.

PATIENT CONTEXT:
${patientContext}

CRITICAL DUPLICATE PREVENTION RULES:
- BEFORE creating any diagnosis, check if it relates to ANY existing diagnosis above
- If symptoms support an existing diagnosis, use "relates_to_existing" with the EXACT diagnosis name
- If you want to suggest "Heart Disease" but "Cardiac Assessment" already exists, set "relates_to_existing": "Cardiac Assessment"
- If you want to suggest "Respiratory Issue" but "Shortness of Breath" already exists, set "relates_to_existing": "Shortness of Breath"
- NEVER create similar/related diagnoses as separate entries

ANALYSIS INSTRUCTIONS:
- High-confidence diagnoses (≥70%) should be PRESERVED unless directly contradicted
- ONLY generate NEW diagnoses for symptoms explicitly mentioned in the current conversation
- Check if new symptoms relate to existing diagnoses before creating new ones
- If symptoms clearly relate to existing diagnoses, use "relates_to_existing" field
- Focus on the primary complaint mentioned by the pet owner
- Generate 1-2 potential diagnoses maximum for new symptoms
- Base confidence on symptom specificity and veterinary likelihood for the species
- Use confidence scale 0.3-0.8 (be conservative)

EXAMPLES OF PROPER DUPLICATE HANDLING:
- Existing: "Chest Pain" → New symptoms about heart → "relates_to_existing": "Chest Pain"
- Existing: "Digestive Issues" → New symptoms about stomach → "relates_to_existing": "Digestive Issues"
- Existing: "Anxiety" → New symptoms about stress → "relates_to_existing": "Anxiety"
- Only create NEW diagnosis if symptoms are completely unrelated to existing ones

CONFIDENCE SCORING:
- 0.3-0.4: Possible but needs more information
- 0.5-0.6: Moderate likelihood based on symptoms
- 0.7-0.8: Strong evidence supporting this possibility

RESPONSE FORMAT (JSON only):
{
  "diagnoses": [
    {
      "diagnosis": "specific condition name OR existing diagnosis name if updating",
      "confidence": 0.65,
      "reasoning": "clear evidence-based justification",
      "relates_to_existing": "exact_existing_diagnosis_name_or_null"
    }
  ],
  "preserve_existing": true
}

Current conversation: "${conversationText}"`
      : `You are a medical analysis AI that generates potential diagnoses based on conversation context. You must be strategic about preserving high-confidence diagnoses while analyzing new symptoms.

PATIENT CONTEXT:
${patientContext}

CRITICAL DUPLICATE PREVENTION RULES:
- BEFORE creating any diagnosis, check if it relates to ANY existing diagnosis above
- If symptoms support an existing diagnosis, use "relates_to_existing" with the EXACT diagnosis name
- If you want to suggest "Heart Disease" but "Chest Pain" already exists, set "relates_to_existing": "Chest Pain"
- If you want to suggest "Acute Coronary Syndrome" but "Cardiac Assessment" already exists, set "relates_to_existing": "Cardiac Assessment"
- If you want to suggest "Panic Attack" but "Anxiety" already exists, set "relates_to_existing": "Anxiety"
- NEVER create similar/related diagnoses as separate entries

ANALYSIS INSTRUCTIONS:
- High-confidence diagnoses (≥70%) should be PRESERVED unless directly contradicted
- ONLY generate NEW diagnoses for symptoms explicitly mentioned in the current conversation
- Check if new symptoms relate to existing diagnoses before creating new ones
- If symptoms clearly relate to existing diagnoses, use "relates_to_existing" field
- Focus on the primary complaint mentioned by the user
- Generate 1-2 potential diagnoses maximum for new symptoms
- Base confidence on symptom specificity and medical likelihood
- Use confidence scale 0.3-0.8 (be conservative)

EXAMPLES OF PROPER DUPLICATE HANDLING:
- Existing: "Chest Pain" → New cardiac symptoms → "relates_to_existing": "Chest Pain"
- Existing: "Digestive Issues" → New GI symptoms → "relates_to_existing": "Digestive Issues"
- Existing: "Anxiety" → New stress symptoms → "relates_to_existing": "Anxiety"
- Existing: "Headache" → New head pain → "relates_to_existing": "Headache"
- Only create NEW diagnosis if symptoms are completely unrelated to existing ones

CONFIDENCE SCORING:
- 0.3-0.4: Possible but needs more information
- 0.5-0.6: Moderate likelihood based on symptoms
- 0.7-0.8: Strong evidence supporting this possibility

RESPONSE FORMAT (JSON only):
{
  "diagnoses": [
    {
      "diagnosis": "specific condition name OR existing diagnosis name if updating",
      "confidence": 0.65,
      "reasoning": "clear evidence-based justification",
      "relates_to_existing": "exact_existing_diagnosis_name_or_null"
    }
  ],
  "preserve_existing": true
}

Current conversation: "${conversationText}"`;

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
        reasoning: d.reasoning || 'No reasoning provided',
        relates_to_existing: d.relates_to_existing || null
      }));

    // Smart diagnosis management: preserve high-confidence, update related, add new
    if (diagnosisData.preserve_existing && highConfidenceDiagnoses.length > 0) {
      // Only delete low-confidence diagnoses, preserve high-confidence ones
      await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id)
        .lt('confidence', 0.7);

      // Process new diagnoses - check for relationships with existing ones
      const finalDiagnoses = [];
      
      for (const newDiag of validDiagnoses) {
        // Enhanced duplicate detection - check against ALL existing diagnoses
        const relatedExisting = allExistingDiagnoses.find(existing => 
          existing.diagnosis.toLowerCase() === newDiag.diagnosis.toLowerCase() ||
          newDiag.relates_to_existing === existing.diagnosis ||
          (newDiag.relates_to_existing && existing.diagnosis.toLowerCase().includes(newDiag.relates_to_existing.toLowerCase())) ||
          (newDiag.relates_to_existing && newDiag.relates_to_existing.toLowerCase().includes(existing.diagnosis.toLowerCase()))
        );
        
        if (relatedExisting) {
          // Update the existing diagnosis with higher confidence if applicable
          const updatedConfidence = Math.max(relatedExisting.confidence, newDiag.confidence);
          await supabase
            .from('conversation_diagnoses')
            .update({
              confidence: updatedConfidence,
              reasoning: `${relatedExisting.reasoning} | Updated: ${newDiag.reasoning}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', relatedExisting.id);
        } else {
          // Add as new diagnosis if it doesn't relate to existing ones
          finalDiagnoses.push({
            conversation_id,
            patient_id,
            user_id: userData.user.id,
            diagnosis: newDiag.diagnosis,
            confidence: newDiag.confidence,
            reasoning: newDiag.reasoning
          });
        }
      }

      // Insert truly new diagnoses
      if (finalDiagnoses.length > 0) {
        const { error: insertError } = await supabase
          .from('conversation_diagnoses')
          .insert(finalDiagnoses);

        if (insertError) {
          console.error('Failed to insert new diagnoses:', insertError);
        }
      }
    } else {
      // Fallback: replace all diagnoses (original behavior for simple cases)
      await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id);

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