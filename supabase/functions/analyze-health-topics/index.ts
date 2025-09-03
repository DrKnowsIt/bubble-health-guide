import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  conversation_id?: string;
  patient_id: string;
  conversation_context: string;
  conversation_type: 'easy_chat' | 'regular_chat';
  user_tier: 'free' | 'basic' | 'pro';
  recent_messages?: any[];
  selected_anatomy?: string[];
  include_solutions?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      conversation_id,
      patient_id,
      conversation_context,
      conversation_type = 'regular_chat',
      user_tier = 'free',
      recent_messages = [],
      selected_anatomy = [],
      include_solutions = true
    }: AnalysisRequest = await req.json();

    if (!patient_id || !conversation_context) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: patient_id and conversation_context' }),
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

    // Verify user authentication
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${conversation_type} conversation for ${user_tier} user`);

    // Smart caching: Check if content has changed significantly
    const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conversation_context));
    const contentHashString = Array.from(new Uint8Array(contentHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for recent analysis with same content hash
    if (conversation_id) {
      const { data: recentAnalysis } = await supabase
        .from('conversation_diagnoses')
        .select('updated_at, reasoning')
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Skip analysis if content unchanged and analyzed recently (within 2 minutes)
      if (recentAnalysis && 
          Date.now() - new Date(recentAnalysis.updated_at).getTime() < 120000 &&
          recentAnalysis.reasoning?.includes(contentHashString.substring(0, 8))) {
        console.log('Skipping analysis - content unchanged (cached)');
        
        // Return existing data
        const { data: existingTopics } = await supabase
          .from('conversation_diagnoses')
          .select('*')
          .eq('conversation_id', conversation_id)
          .eq('patient_id', patient_id)
          .order('confidence', { ascending: false });

        const { data: existingSolutions } = include_solutions ? await supabase
          .from('conversation_solutions')
          .select('*')
          .eq('conversation_id', conversation_id)
          .order('confidence', { ascending: false }) : { data: [] };

        return new Response(
          JSON.stringify({ 
            topics: existingTopics || [],
            solutions: existingSolutions || [],
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get patient context based on user tier
    let patientContext = '';
    let memoryContext = '';
    let healthFormsContext = '';

    if (user_tier !== 'free') {
      // Enhanced context for Basic/Pro users
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (patient) {
        const patientAge = patient.date_of_birth 
          ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
Gender: ${patient.gender || 'Not specified'}
${patient.is_pet ? `Species: ${patient.species || 'Not specified'}` : ''}`;

        // Get conversation memory for enhanced context
        if (user_tier === 'pro') {
          const { data: memories } = await supabase
            .from('conversation_memory')
            .select('memory_data')
            .eq('patient_id', patient_id)
            .eq('user_id', userData.user.id)
            .order('updated_at', { ascending: false })
            .limit(5);

          if (memories && memories.length > 0) {
            memoryContext = '\n\nPATIENT HISTORY:\n' + 
              memories.map(m => JSON.stringify(m.memory_data)).join('\n');
          }

          // Get health forms data
          const { data: healthRecords } = await supabase
            .from('health_records')
            .select('title, data, record_type')
            .eq('patient_id', patient_id)
            .eq('user_id', userData.user.id)
            .order('created_at', { ascending: false })
            .limit(3);

          if (healthRecords && healthRecords.length > 0) {
            healthFormsContext = '\n\nHEALTH RECORDS:\n' + 
              healthRecords.map(hr => `${hr.title} (${hr.record_type}): ${JSON.stringify(hr.data).substring(0, 200)}`).join('\n');
          }
        }
      }
    } else {
      // Basic context for Free mode
      patientContext = `Free Mode User - Limited Context Available
Selected Anatomy: ${selected_anatomy.join(', ') || 'None specified'}`;
    }

    // Build comprehensive system prompt
    const systemPrompt = `You are a medical analysis AI that generates health topics and ${include_solutions ? 'holistic solutions' : 'recommendations'} based on conversation context.

PATIENT CONTEXT:
${patientContext}${memoryContext}${healthFormsContext}

ANALYSIS MODE: ${conversation_type.toUpperCase()} (${user_tier.toUpperCase()} tier)

CONFIDENCE CALIBRATION (CRITICAL):
- FREE MODE: Use conservative confidence (10-40%) due to limited context
- BASIC MODE: Use moderate confidence (20-60%) with basic patient data
- PRO MODE: Use higher confidence (30-80%) with full context and history

CONFIDENCE GUIDELINES:
HIGH (70-80%): Multiple specific symptoms, clear patterns, rich context
MEDIUM (40-69%): Some symptoms mentioned, moderate detail
LOW (20-39%): Vague mentions, limited specificity
VERY LOW (10-19%): Minimal evidence, highly speculative

TOPIC CATEGORIES:
musculoskeletal, dermatological, gastrointestinal, cardiovascular, respiratory, neurological, genitourinary, endocrine, psychiatric, infectious, environmental, other

${include_solutions ? `
SOLUTION CATEGORIES:
lifestyle, stress, sleep, nutrition, exercise, mental_health

SOLUTION RULES:
- NO medications or medical treatments
- Focus on lifestyle, behavioral, environmental changes
- Must be actionable and specific to conversation issues
- Target root causes when possible
` : ''}

Return JSON with this exact structure:
{
  "topics": [
    {
      "topic": "Specific Health Topic",
      "confidence": 0.65,
      "reasoning": "Evidence-based justification with hash: ${contentHashString.substring(0, 8)}",
      "category": "musculoskeletal"
    }
  ]${include_solutions ? `,
  "solutions": [
    {
      "solution": "Specific actionable solution",
      "category": "lifestyle",
      "confidence": 0.55,
      "reasoning": "Why this addresses the conversation issues"
    }
  ]` : ''}
}

Ensure exactly 4 topics and ${include_solutions ? '3-5 solutions' : 'no solutions'}.`;

    // Make OpenAI API call
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
          { role: 'user', content: `Analyze: ${conversation_context}` }
        ],
        max_completion_tokens: include_solutions ? 1500 : 800,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
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

    let analysisData;
    try {
      analysisData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean data
    const topics = (analysisData.topics || [])
      .filter((t: any) => t.topic && t.confidence >= 0.1)
      .map((t: any) => ({
        topic: t.topic,
        confidence: Math.min(Math.max(t.confidence, 0.1), 0.9),
        reasoning: t.reasoning || 'No reasoning provided',
        category: t.category || 'other'
      }));

    const solutions = include_solutions ? (analysisData.solutions || [])
      .filter((s: any) => s.solution && s.confidence >= 0.1)
      .map((s: any) => ({
        solution: s.solution,
        confidence: Math.min(Math.max(s.confidence, 0.1), 0.9),
        reasoning: s.reasoning || 'No reasoning provided',
        category: s.category || 'lifestyle'
      })) : [];

    // Store results in database if conversation_id provided
    if (conversation_id && topics.length > 0) {
      // Clear existing data for this conversation
      await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('conversation_id', conversation_id);

      if (include_solutions) {
        await supabase
          .from('conversation_solutions')
          .delete()
          .eq('conversation_id', conversation_id);
      }

      // Insert topics
      const topicsToInsert = topics.map((topic: any) => ({
        conversation_id,
        patient_id,
        user_id: userData.user.id,
        diagnosis: topic.topic,
        confidence: topic.confidence,
        reasoning: topic.reasoning,
        category: topic.category
      }));

      await supabase
        .from('conversation_diagnoses')
        .insert(topicsToInsert);

      // Insert solutions if requested
      if (include_solutions && solutions.length > 0) {
        const solutionsToInsert = solutions.map((solution: any) => ({
          conversation_id,
          patient_id,
          user_id: userData.user.id,
          solution: solution.solution,
          confidence: solution.confidence,
          reasoning: solution.reasoning,
          category: solution.category
        }));

        await supabase
          .from('conversation_solutions')
          .insert(solutionsToInsert);
      }
    }

    console.log(`Successfully generated ${topics.length} topics and ${solutions.length} solutions`);

    return new Response(
      JSON.stringify({ 
        topics,
        solutions,
        cached: false,
        analysis_type: `${conversation_type}_${user_tier}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-topics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        topics: [],
        solutions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
