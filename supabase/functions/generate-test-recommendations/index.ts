import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const { patient_id, conversation_id, health_context } = await req.json();

    // Validate required parameters
    if (!patient_id) {
      return new Response(JSON.stringify({ error: 'patient_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch health records for context
    const { data: healthRecords } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch recent conversation diagnoses if conversation_id provided
    let conversationContext = '';
    if (conversation_id) {
      const { data: diagnoses } = await supabase
        .from('conversation_diagnoses')
        .select('diagnosis, reasoning, confidence')
        .eq('conversation_id', conversation_id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (diagnoses && diagnoses.length > 0) {
        conversationContext = diagnoses.map(d => `${d.diagnosis}: ${d.reasoning}`).join('\n');
      }
    }

    const isPatientPet = patient.is_pet;
    const patientAge = patient.date_of_birth 
      ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // Prepare health records summary
    const healthRecordsSummary = healthRecords?.length 
      ? healthRecords.map(record => `${record.title} (${record.record_type}): ${record.data ? JSON.stringify(record.data).substring(0, 200) : 'No details'}`).join('\n')
      : 'No health records available';

    // Construct AI prompt for test recommendations
    const systemPrompt = `You are an expert ${isPatientPet ? 'veterinary' : 'medical'} AI assistant specializing in diagnostic test recommendations. Analyze the provided ${isPatientPet ? 'pet' : 'patient'} information and recommend appropriate tests.

Patient Context:
- ${isPatientPet ? `Species: ${patient.species}, Breed: ${patient.breed}` : `Human patient`}
- Age: ${patientAge || 'Unknown'} ${isPatientPet ? 'years' : 'years old'}
- Gender: ${patient.gender || 'Not specified'}

Health Records Summary:
${healthRecordsSummary}

${conversationContext ? `Recent Health Concerns:\n${conversationContext}` : ''}

${health_context ? `Additional Context:\n${health_context}` : ''}

Provide test recommendations in the following JSON format:
{
  "recommended_tests": [
    {
      "test_name": "Complete Blood Count (CBC)",
      "test_code": "CBC_85025",
      "category": "blood_work|imaging|specialized|preventive|diagnostic",
      "reason": "Specific medical reason for this test based on findings",
      "urgency": "routine|urgent|stat", 
      "confidence": 0.8,
      "contraindications": ["condition1", "condition2"],
      "estimated_cost_range": "$50-$100",
      "patient_prep_required": true,
      "related_concerns": ["concern1", "concern2"]
    }
  ]
}

Guidelines:
1. Recommend only tests that are clinically justified based on the provided information
2. Consider ${isPatientPet ? 'species-appropriate veterinary tests' : 'standard medical screening guidelines'}
3. Prioritize tests by clinical urgency and diagnostic value
4. Avoid recommending tests without clear clinical indication
5. Consider patient age, ${isPatientPet ? 'species, breed, ' : ''}and any contraindications
6. Provide specific, actionable test recommendations with clear reasoning
7. Include both diagnostic tests for current concerns and age-appropriate preventive screenings
8. Keep cost estimates realistic and include preparation requirements

Respond only with valid JSON.`;

    // Call OpenAI API
    console.log('Calling OpenAI for test recommendations...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this ${isPatientPet ? 'pet' : 'patient'} and recommend appropriate diagnostic tests.` }
        ],
        max_completion_tokens: 1500
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate test recommendations' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', openaiData);
      return new Response(JSON.stringify({ error: 'No test recommendations generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the AI response
    let testRecommendations;
    try {
      const parsedResponse = JSON.parse(content);
      testRecommendations = parsedResponse.recommended_tests || [];
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content:', content);
      return new Response(JSON.stringify({ error: 'Invalid response format from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generated ${testRecommendations.length} test recommendations`);

    return new Response(JSON.stringify({ 
      success: true,
      recommended_tests: testRecommendations,
      patient_id,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-test-recommendations function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});