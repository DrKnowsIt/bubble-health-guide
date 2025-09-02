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

    if (!conversation_context) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: conversation_context' }),
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

    // Try to get patient info if patient_id provided, otherwise use generic context
    let patientContext = 'Patient: Anonymous user';
    
    if (patient_id) {
      console.log('Looking up patient with ID:', patient_id);
      
      // Try to find patient in patients table first
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (patient) {
        console.log('Found patient:', patient.first_name, patient.last_name);
        const patientAge = patient.date_of_birth 
          ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
Gender: ${patient.gender || 'Not specified'}`;
      } else {
        // If patient_id matches user_id, use that
        if (patient_id === userData.user.id) {
          console.log('Using user as patient');
          patientContext = 'Patient: Current user (self-assessment)';
        } else {
          console.log('Patient not found, using generic context');
          patientContext = 'Patient: Anonymous user';
        }
      }
    }

    const systemPrompt = `You are a medical analysis AI that generates health topics based on guided conversation responses from an Easy Chat system.

PATIENT CONTEXT:
${patientContext}

ANALYSIS INSTRUCTIONS:
- Analyze the guided conversation (questions and answers) to identify relevant health topics
- Generate 2-4 health topics when conversation has sufficient detail (prefer 3-4 when possible)
- Use MEDICAL TERMINOLOGY and ICD-10-style classifications where appropriate
- Include anatomical terms, pathophysiological processes, and clinical descriptors
- Each topic should be clinically specific and medically accurate
- Provide detailed reasoning that explains the clinical basis for each topic
- Prioritize topics by clinical significance and evidence strength from conversation

MEDICAL TERMINOLOGY REQUIREMENTS:
- Use proper medical nomenclature (e.g., "Patellofemoral Pain Syndrome" not "Knee Pain")
- Include anatomical specificity (e.g., "Inguinal Dermatitis" not "Itchy Area")
- Reference relevant systems (e.g., "Musculoskeletal", "Dermatological", "Gastrointestinal")
- Use clinical descriptors (e.g., "Acute", "Chronic", "Bilateral", "Unilateral")

ENHANCED CONFIDENCE SCORING GUIDELINES:
Analyze these factors to calculate realistic confidence percentages:

HIGH CONFIDENCE (70-89%):
- Multiple specific symptoms described in detail
- Clear temporal patterns mentioned (duration, frequency)
- Patient provides unprompted anatomical details
- Symptoms interfere with daily activities
- Example: "Sharp stabbing pain in right knee when climbing stairs, lasting 3 weeks"

MEDIUM CONFIDENCE (40-69%):
- Some symptom specificity but lacking detail
- General location mentioned without precision
- Single symptom domain reported
- Vague temporal information
- Example: "My knee hurts sometimes when I walk"

LOW CONFIDENCE (15-39%):
- Vague or non-specific mentions
- Single word responses about symptoms
- No temporal or severity information
- Speculative connections based on limited information
- Example: "Yeah, it's uncomfortable"

CONFIDENCE CALCULATION FACTORS:
- Conversation depth: More detailed responses = higher confidence
- Symptom specificity: Precise descriptions = +10-15% confidence
- Duration mentioned: Time frames provided = +10% confidence
- Severity indicators: Impact on function = +10-15% confidence
- Multiple corroborating symptoms: Related findings = +5-10% confidence
- Anatomical precision: Specific body regions = +5-10% confidence

RESPONSE FORMAT (JSON only):
{
  "topics": [
    {
      "topic": "Medically precise topic using proper terminology",
      "confidence": 0.XX,
      "reasoning": "Detailed clinical reasoning referencing specific conversation elements and confidence factors",
      "category": "musculoskeletal|dermatological|gastrointestinal|cardiovascular|respiratory|neurological|genitourinary|endocrine|psychiatric|other"
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
        max_completion_tokens: 1000,
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

    // Validate and process topics with prioritization
    const validTopics = (topicsData.topics || [])
      .filter((t: any) => t.topic && t.confidence >= 0.15)
      .map((t: any) => ({
        topic: t.topic,
        confidence: Math.min(Math.max(t.confidence, 0.15), 0.89),
        reasoning: t.reasoning || 'Based on conversation responses',
        category: t.category || 'other'
      }))
      .sort((a, b) => b.confidence - a.confidence) // Sort by confidence descending
      .slice(0, 4); // Limit to top 4 topics

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