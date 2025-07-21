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
    const { message, conversation_history = [], patient_id, user_id } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const grokApiKey = Deno.env.get('GROK_API_KEY');
    if (!grokApiKey) {
      return new Response(
        JSON.stringify({ error: 'Grok API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch patient data and health records if patient_id is provided
    let patientContext = '';
    let currentDiagnoses = [];
    
    if (patient_id && user_id) {
      // Get patient information
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', user_id)
        .single();

      // Get health records for this patient
      const { data: healthRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('user_id', user_id);

      if (patient) {
        currentDiagnoses = patient.probable_diagnoses || [];
        patientContext = `
PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${patient.date_of_birth ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
- Gender: ${patient.gender || 'Not specified'}
- Relationship: ${patient.relationship}

HEALTH RECORDS: ${healthRecords?.length ? healthRecords.map(record => `
- ${record.title} (${record.record_type}): ${record.data ? JSON.stringify(record.data) : 'No data'}`).join('\n') : 'No health records available'}

CURRENT PROBABLE DIAGNOSES: ${currentDiagnoses.length ? currentDiagnoses.map(d => `${d.diagnosis} (${Math.round(d.confidence * 100)}% confidence)`).join(', ') : 'None yet'}
        `;
      }
    }

    // Build messages array with conversation history
    const messages = [
      {
        role: 'system',
        content: `You are DrKnowsIt, an AI health diagnostic assistant. You work step-by-step through symptoms to provide potential diagnoses while emphasizing professional medical consultation.

${patientContext}

CORE INSTRUCTIONS:
- Keep responses SHORT (1-3 sentences) unless asked to expand or clarify
- Think like a doctor: systematic, thorough, evidence-based
- Work through symptoms methodically using available patient data
- Suggest relevant health forms based on conversation context
- Update probable diagnoses with confidence scores after each interaction
- Always emphasize that you cannot replace professional medical advice

RESPONSE FORMAT:
- Give brief, focused answers unless complexity requires detail
- Ask ONE targeted follow-up question at a time
- Suggest specific health forms when relevant to symptoms discussed
- Be empathetic but professional

DIAGNOSTIC APPROACH:
1. Analyze symptoms against patient's existing data
2. Ask clarifying questions to narrow possibilities  
3. Consider differential diagnoses based on symptom patterns
4. Assign confidence scores based on: symptom clarity, patient history, supporting data
5. Recommend appropriate next steps (forms, tests, doctor consultation)

If you identify potential diagnoses, return them in this JSON format within your response:
{
  "diagnoses": [
    {"diagnosis": "condition name", "confidence": 0.75, "reasoning": "brief explanation"}
  ],
  "suggested_forms": ["form type 1", "form type 2"]
}`
      },
      // Add conversation history
      ...conversation_history.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Add current message
      {
        role: 'user',
        content: message
      }
    ];

    console.log('Sending request to Grok API with', messages.length, 'messages');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini-fast',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from Grok AI',
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Grok API response received');

    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response content from Grok AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and update probable diagnoses if present
    let updatedDiagnoses = null;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"diagnoses"[\s\S]*\}/);
      if (jsonMatch && patient_id) {
        const diagnosisData = JSON.parse(jsonMatch[0]);
        if (diagnosisData.diagnoses) {
          // Merge with existing diagnoses, keeping top 5 by confidence
          const newDiagnoses = diagnosisData.diagnoses.map(d => ({
            ...d,
            updated_at: new Date().toISOString()
          }));
          
          // Combine and deduplicate
          const combined = [...currentDiagnoses];
          newDiagnoses.forEach(newDiag => {
            const existing = combined.findIndex(d => d.diagnosis === newDiag.diagnosis);
            if (existing >= 0) {
              combined[existing] = newDiag; // Update existing
            } else {
              combined.push(newDiag); // Add new
            }
          });
          
          // Sort by confidence and keep top 5
          updatedDiagnoses = combined
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

          // Update patient record
          await supabase
            .from('patients')
            .update({ probable_diagnoses: updatedDiagnoses })
            .eq('id', patient_id)
            .eq('user_id', user_id);
        }
      }
    } catch (error) {
      console.log('No diagnosis data to extract:', error);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        model: 'grok-3-mini-fast',
        usage: data.usage,
        updated_diagnoses: updatedDiagnoses
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grok-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});