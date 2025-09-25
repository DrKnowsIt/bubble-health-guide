import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { health_record_id, force_regenerate = false } = await req.json();
    
    if (!health_record_id) {
      return new Response(
        JSON.stringify({ error: 'health_record_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the health record
    const { data: healthRecord, error: recordError } = await supabaseClient
      .from('health_records')
      .select('*')
      .eq('id', health_record_id)
      .single();

    if (recordError || !healthRecord) {
      return new Response(
        JSON.stringify({ error: 'Health record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if summary already exists and force_regenerate is false
    if (!force_regenerate) {
      const { data: existingSummary } = await supabaseClient
        .from('health_record_summaries')
        .select('*')
        .eq('health_record_id', health_record_id)
        .single();

      if (existingSummary) {
        return new Response(
          JSON.stringify({ 
            summary: existingSummary,
            message: 'Existing summary returned'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine priority level based on record type
    const getPriorityLevel = (recordType: string, data: any) => {
      const alwaysPriority = ['demographics', 'vitals', 'family_history', 'medications', 'allergies', 'recent_trauma'];
      const conditionalPriority = ['dna', 'detailed_forms', 'lifestyle'];
      
      if (alwaysPriority.includes(recordType.toLowerCase())) {
        return 'always';
      } else if (conditionalPriority.includes(recordType.toLowerCase())) {
        return 'conditional';
      }
      return 'normal';
    };

    // Create content for summarization
    const recordContent = `
Title: ${healthRecord.title}
Type: ${healthRecord.record_type}
Data: ${healthRecord.data ? JSON.stringify(healthRecord.data, null, 2) : 'No structured data'}
${healthRecord.file_url ? 'Contains file attachment' : ''}
Created: ${healthRecord.created_at}
    `.trim();

    // Generate summary using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const summaryPrompt = `
You are a medical AI assistant specializing in health record analysis. Please create a concise, medically accurate summary of the following health record. 

Focus on:
1. Key medical information and findings
2. Relevant symptoms, conditions, or diagnoses
3. Important dates and measurements
4. Actionable insights for future reference

Keep the summary under 150 words but ensure all critical information is preserved.

Health Record:
${recordContent}
    `.trim();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are a medical AI assistant that creates concise, accurate summaries of health records.' 
          },
          { role: 'user', content: summaryPrompt }
        ],
        max_completion_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const openAIData = await response.json();
    const summaryText = openAIData.choices[0].message.content;

    // Save the summary
    const priorityLevel = getPriorityLevel(healthRecord.record_type, healthRecord.data);
    
    const { data: newSummary, error: summaryError } = await supabaseClient
      .from('health_record_summaries')
      .upsert({
        user_id: healthRecord.user_id,
        health_record_id: health_record_id,
        summary_text: summaryText,
        summary_type: 'ai_generated',
        priority_level: priorityLevel,
      })
      .select()
      .single();

    if (summaryError) {
      throw new Error(`Failed to save summary: ${summaryError.message}`);
    }

    console.log(`Generated summary for health record ${health_record_id}`);

    return new Response(
      JSON.stringify({ 
        summary: newSummary,
        message: 'Summary generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-health-records function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});