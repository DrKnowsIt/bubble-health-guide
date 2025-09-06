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
  user_id?: string;
  conversation_context: string;
  conversation_type?: 'easy_chat' | 'regular_chat';
  user_tier?: 'free' | 'basic' | 'pro';
  recent_messages?: any[];
  selected_anatomy?: string[];
  include_solutions?: boolean;
  analysis_mode?: string;
  include_testing_recommendations?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversation_context, 
      patient_id, 
      user_id, 
      conversation_id,
      include_solutions = false,
      analysis_mode = 'standard',
      include_testing_recommendations = false,
      selected_anatomy = []
    } = await req.json();

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

    // Enhanced conversation type detection
    const isEasyChatSession = patient_id === 'ai_free_mode_user' || analysis_mode === 'comprehensive_final';
    const conversation_type = isEasyChatSession ? 'easy_chat' : 'full_chat';
    
    // For comprehensive final analysis, treat as basic tier for better insights
    const user_tier = analysis_mode === 'comprehensive_final' ? 'basic' : (isEasyChatSession ? 'free' : userData.user?.user_metadata?.subscription_tier || 'free');

    console.log(`Analyzing ${conversation_type} conversation for ${user_tier} user`);

    // Smart caching: Check if content has changed significantly
    const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conversation_context));
    const contentHashString = Array.from(new Uint8Array(contentHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Skip caching for comprehensive final analysis to ensure fresh insights
    if (conversation_id && analysis_mode !== 'comprehensive_final') {
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

    // System prompt for comprehensive analysis
    const isComprehensiveAnalysis = analysis_mode === 'comprehensive_final';
    const systemPrompt = `You are a medical AI assistant analyzing a health conversation for ${conversation_type === 'easy_chat' ? 'AI Free Mode' : 'full chat'}. ${patientContext}

${memoryContext}

${healthFormsContext}

ANALYSIS MODE: ${isComprehensiveAnalysis ? 'COMPREHENSIVE FINAL ANALYSIS' : 'STANDARD ANALYSIS'}

${isComprehensiveAnalysis ? `
COMPREHENSIVE ANALYSIS REQUIREMENTS:
- Provide thorough final analysis of the complete conversation
- Focus on the most significant health topics with detailed reasoning
- Include actionable recommendations across multiple categories
- Suggest appropriate medical tests and evaluations
- Rank everything by clinical priority and confidence
` : ''}

CRITICAL INSTRUCTIONS:
- Analyze conversation for health topics only
- Base confidence on conversation evidence only
- NO DISCLAIMERS in responses
- Be specific about symptoms and concerns discussed
- ${isComprehensiveAnalysis ? 'Focus on comprehensive insights for final summary' : 'Standard topic identification'}

CONFIDENCE CALIBRATION:
HIGH (65-80%): Strong evidence from multiple conversation elements, clear symptom patterns
MODERATE (40-64%): Some evidence present, symptoms mentioned with context
LOW (20-39%): Limited evidence, vague or single mentions
VERY LOW (10-19%): Minimal evidence, highly speculative

TOPIC CATEGORIES:
musculoskeletal, dermatological, gastrointestinal, cardiovascular, respiratory, neurological, genitourinary, endocrine, psychiatric, infectious, environmental, other

${include_solutions ? `
SOLUTION CATEGORIES:
lifestyle, stress, sleep, nutrition, exercise, mental_health, medical, general

SOLUTION RULES:
- Provide actionable lifestyle and self-care recommendations
- ${isComprehensiveAnalysis ? 'Include holistic approaches (lifestyle, diet, exercise, stress management)' : 'Focus on immediate actionable steps'}
- Must be specific to conversation issues
- Target root causes when possible
- Categorize appropriately for easy organization
` : ''}

${include_testing_recommendations && isComprehensiveAnalysis ? `
TESTING RECOMMENDATIONS:
- Suggest appropriate medical tests based on discussed symptoms
- Consider common diagnostic evaluations for identified conditions
- Include both basic screening and specific targeted tests
- Keep recommendations realistic and commonly ordered
- Format as brief, clear descriptions
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
  ]` : ''}${include_testing_recommendations && isComprehensiveAnalysis ? `,
  "testing_recommendations": [
    "Complete Blood Count (CBC) to check for infection or anemia",
    "Basic Metabolic Panel to assess organ function",
    "X-ray or imaging if musculoskeletal concerns present"
  ]` : ''}
}

Ensure exactly ${isComprehensiveAnalysis ? '5' : '4'} topics and ${include_solutions ? (isComprehensiveAnalysis ? '6-8 solutions' : '3-5 solutions') : 'no solutions'}${include_testing_recommendations && isComprehensiveAnalysis ? ' and 4-6 testing recommendations' : ''}.`;

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
        max_completion_tokens: include_testing_recommendations ? 2000 : (include_solutions ? 1500 : 800),
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

    // Confidence validation per tier
    const getConfidenceRange = (tier: string) => {
      switch (tier) {
        case 'free': return { min: 0.1, max: 0.4 };
        case 'basic': return { min: 0.2, max: 0.6 };
        case 'pro': return { min: 0.3, max: 0.8 };
        default: return { min: 0.1, max: 0.4 };
      }
    };

    const confidenceRange = getConfidenceRange(user_tier);

    // Validate and clean data with tier-specific confidence ranges
    const topics = (analysisData.topics || [])
      .filter((t: any) => t.topic && t.confidence >= 0.05)
      .map((t: any) => ({
        topic: t.topic?.substring(0, 255) || 'Unknown topic',
        confidence: Math.min(Math.max(t.confidence || 0.2, confidenceRange.min), confidenceRange.max),
        reasoning: t.reasoning?.substring(0, 500) || 'No reasoning provided',
        category: t.category || 'other'
      }))
      .slice(0, isComprehensiveAnalysis ? 5 : 4);

    const solutions = include_solutions ? (analysisData.solutions || [])
      .filter((s: any) => s.solution && s.confidence >= 0.05)
      .map((s: any) => ({
        solution: s.solution?.substring(0, 255) || 'Unknown solution',
        confidence: Math.min(Math.max(s.confidence || 0.2, confidenceRange.min), confidenceRange.max),
        reasoning: s.reasoning?.substring(0, 500) || 'No reasoning provided',
        category: s.category || 'general'
      }))
      .slice(0, isComprehensiveAnalysis ? 8 : 5) : [];

    // Extract testing recommendations for comprehensive analysis
    const testing_recommendations = (include_testing_recommendations && isComprehensiveAnalysis) 
      ? (analysisData.testing_recommendations || [])
          .filter((test: any) => typeof test === 'string' && test.length > 0)
          .map((test: string) => test.substring(0, 200))
          .slice(0, 6)
      : [];

    // Store results in database if conversation_id provided (skip for comprehensive analysis to avoid duplication)
    if (conversation_id && topics.length > 0 && analysis_mode !== 'comprehensive_final') {
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
        testing_recommendations,
        cached: false,
        analysis_type: `${conversation_type}_${user_tier}_${analysis_mode}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-health-topics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        topics: [],
        solutions: [],
        testing_recommendations: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
