import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
    const { health_record_id } = await req.json();

    if (!health_record_id) {
      throw new Error('health_record_id is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the health record
    const { data: healthRecord, error: recordError } = await supabase
      .from('health_records')
      .select('*')
      .eq('id', health_record_id)
      .single();

    if (recordError || !healthRecord) {
      throw new Error('Health record not found');
    }

    // Get patient info for context (age, gender, etc.)
    let patientContext = '';
    if (healthRecord.patient_id) {
      const { data: patient } = await supabase
        .from('patients')
        .select('date_of_birth, gender, first_name')
        .eq('id', healthRecord.patient_id)
        .single();
      
      if (patient) {
        const age = patient.date_of_birth ? 
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'unknown';
        patientContext = `Patient: ${patient.first_name}, Age: ${age}, Gender: ${patient.gender || 'not specified'}`;
      }
    }

    // Prepare the health record data for analysis
    const recordData = typeof healthRecord.data === 'string' 
      ? healthRecord.data 
      : JSON.stringify(healthRecord.data);

    // Construct prompt for OpenAI
    const systemPrompt = `You are a medical AI assistant analyzing health record data to identify important, abnormal, or concerning findings that require attention. 

    Your task is to:
    1. Identify abnormal values, concerning symptoms, or health risks
    2. Classify each finding by severity: urgent, moderate, or watch
    3. Provide clear explanations and recommendations
    4. Consider the patient's age, gender, and context when available

    Return your analysis as a JSON array of insights, each with:
    {
      "insight_type": "abnormal" | "concerning" | "risk_factor" | "symptom",
      "severity_level": "urgent" | "moderate" | "watch",
      "title": "Brief title of the finding",
      "description": "Detailed explanation of what was found and why it's important",
      "recommendation": "What the patient should do about this finding",
      "confidence_score": 0.0-1.0
    }

    Only include findings that are genuinely concerning or abnormal. Do not flag normal or expected values.`;

    const userPrompt = `Analyze this health record for important findings:

    Record Type: ${healthRecord.record_type}
    Title: ${healthRecord.title}
    ${patientContext}

    Health Data:
    ${recordData}`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to analyze health record');
    }

    const openaiData = await openaiResponse.json();
    const analysisContent = openaiData.choices[0].message.content;
    
    let insights;
    try {
      const parsed = JSON.parse(analysisContent);
      insights = parsed.insights || parsed || [];
    } catch (e) {
      console.error('Failed to parse OpenAI response:', analysisContent);
      insights = [];
    }

    // Store insights in database
    const insightsToStore = insights.map((insight: any) => ({
      user_id: healthRecord.user_id,
      patient_id: healthRecord.patient_id,
      health_record_id: health_record_id,
      insight_type: insight.insight_type || 'concerning',
      severity_level: insight.severity_level || 'moderate',
      title: insight.title || 'Health Finding',
      description: insight.description || '',
      recommendation: insight.recommendation || null,
      confidence_score: insight.confidence_score || null,
    }));

    if (insightsToStore.length > 0) {
      const { error: insertError } = await supabase
        .from('health_insights')
        .insert(insightsToStore);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
        throw new Error('Failed to store health insights');
      }

      console.log(`Stored ${insightsToStore.length} health insights for record ${health_record_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights_count: insightsToStore.length,
        insights: insightsToStore 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});