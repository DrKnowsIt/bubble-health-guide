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
    const { conversation_context, patient_id, conversation_type } = await req.json();

    console.log('Analyzing Easy Chat topics for patient:', patient_id);
    console.log('Conversation type:', conversation_type);
    console.log('Context length:', conversation_context?.length || 0);

    if (!conversation_context || !patient_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: conversation_context, patient_id' }),
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

    // Get patient context
    const patientAge = patient.date_of_birth 
      ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
Gender: ${patient.gender || 'Not specified'}`;

    const systemPrompt = `You are a medical analysis AI that generates health topics based on guided conversation responses from an Easy Chat system.

PATIENT CONTEXT:
${patientContext}

ANALYSIS INSTRUCTIONS:
- Analyze the guided conversation (questions and answers) to identify relevant health topics
- Focus on symptoms, conditions, or health concerns mentioned in responses
- Generate health topics with confidence scores based on the specificity and medical relevance
- Each topic should have a clear category (symptoms, conditions, wellness, etc.)
- Provide reasoning that explains why this topic is relevant based on the conversation
- Generate 3-5 topics maximum, prioritizing the most relevant ones
- Be conservative with confidence scores - this is preliminary screening

CONFIDENCE SCORING:
- 0.3-0.4: Possible concern mentioned but needs more detail
- 0.5-0.6: Clear symptom or concern identified
- 0.7-0.8: Well-defined health topic with specific details
- 0.8+: Reserved for urgent or clearly defined conditions

RESPONSE FORMAT (JSON only):
{
  "topics": [
    {
      "topic": "specific health topic or condition",
      "confidence": 0.65,
      "reasoning": "explanation based on conversation responses",
      "category": "symptoms|conditions|wellness|prevention|lifestyle"
    }
  ]
}

Easy Chat Conversation:
${conversation_context}`;

    console.log('Sending request to OpenAI for Easy Chat analysis...');

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
          { role: 'user', content: `Analyze this Easy Chat conversation and generate health topics: ${conversation_context}` }
        ],
        max_completion_tokens: 600,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze Easy Chat conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No response from OpenAI');
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let topicsData;
    try {
      topicsData = JSON.parse(aiResponse);
      console.log('Successfully parsed topics:', topicsData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and process topics
    const validTopics = (topicsData.topics || [])
      .filter((t: any) => t.topic && t.confidence >= 0.3)
      .map((t: any) => ({
        topic: t.topic,
        confidence: Math.min(Math.max(t.confidence, 0.3), 0.9),
        reasoning: t.reasoning || 'Based on conversation responses',
        category: t.category || 'general'
      }))
      .slice(0, 5); // Limit to 5 topics

    console.log(`Generated ${validTopics.length} valid topics`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnoses: validTopics, // Keep this field name for compatibility with the panel
        topics: validTopics,
        analyzed_context_length: conversation_context.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-easy-chat-topics function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});