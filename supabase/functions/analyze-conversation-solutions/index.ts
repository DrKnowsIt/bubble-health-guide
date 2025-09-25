import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("analyze-conversation-solutions function loaded");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, patient_id, recent_messages } = await req.json();
    
    if (!conversation_id || !patient_id) {
      throw new Error('Missing required parameters: conversation_id and patient_id');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client with JWT for RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify patient ownership
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .eq('user_id', user.id)
      .single();
      
    if (patientError || !patient) {
      throw new Error('Patient not found or access denied');
    }

    console.log("Analyzing conversation for holistic solutions:", recent_messages?.slice(0, 3).map((m: any) => m.content).join(' '));

    // Get existing solutions to avoid duplicates
    const { data: existingSolutions } = await supabase
      .from('conversation_solutions')
      .select('solution')
      .eq('conversation_id', conversation_id);

    const existingSolutionTexts = existingSolutions?.map(s => s.solution) || [];

    // De-identify patient data before AI analysis
    const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!;
    const rawConversationText = recent_messages?.map((msg: any) => 
      msg.type === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`
    ).join('\n') || '';

    const deIdentifyResponse = await fetch(`${supabaseServiceUrl}/functions/v1/de-identify-data`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_id: patient_id,
        conversation_text: rawConversationText
      }),
    });

    if (!deIdentifyResponse.ok) {
      console.error('Failed to de-identify patient data');
      throw new Error('Failed to de-identify patient data');
    }

    const deIdentifiedData = await deIdentifyResponse.json();
    console.log('Successfully de-identified data for solutions analysis');

    // Build conversation context with de-identified data
    const conversationText = deIdentifiedData.de_identified_text || '';

    // Create prompt for holistic solution analysis
    const systemPrompt = `You are a holistic wellness advisor. Your task is to analyze health conversations and suggest evidence-based holistic solutions with REALISTIC confidence scores.

🎯 CONFIDENCE SCORING MISSION CRITICAL RULES:
1. NEVER use 90% confidence unless there is overwhelming specific evidence
2. DISTRIBUTE scores realistically: 20% low (10-40%), 60% medium (40-70%), 20% high (70-85%)
3. DEFAULT to LOWER confidence when in doubt - it's better to be conservative
4. Each confidence score must be JUSTIFIED by specific evidence from the conversation

CONFIDENCE CALIBRATION FRAMEWORK:

🔴 VERY HIGH CONFIDENCE (80-90%) - EXTREMELY RARE - Use ONLY when:
- Patient provides explicit, detailed description of specific symptoms/triggers
- Multiple clear cause-and-effect relationships mentioned
- Patient demonstrates deep understanding of their condition
- Solution directly targets the exact root cause with scientific backing
Example: "I get migraines every time I eat aged cheese, drink wine, or skip meals. It always starts with visual aura, then severe left-side pain." = 87% confidence for "Migraine Trigger Avoidance Protocol"

🟡 HIGH CONFIDENCE (65-79%) - RARE - Use when:
- Clear specific problems mentioned with good detail
- Patient describes patterns or timing
- Strong evidence supporting the holistic approach
Example: "I can't fall asleep because I drink coffee at 4pm and use my phone in bed" = 72% confidence for "Sleep Hygiene Protocol"

🟢 MEDIUM CONFIDENCE (40-64%) - MOST COMMON - Use when:
- Patient mentions problems with moderate detail
- Some lifestyle factors are evident
- Reasonable connection between issue and solution
Example: "I'm stressed at work and tired all the time" = 52% confidence for "Stress Management Techniques"

🔵 LOW CONFIDENCE (25-39%) - COMMON - Use when:
- Vague problem descriptions
- Limited specific details provided
- Solution is beneficial but somewhat speculative
Example: "I don't feel great lately" = 31% confidence for "Comprehensive Wellness Assessment"

🟣 VERY LOW CONFIDENCE (10-24%) - Use when:
- Minimal evidence in conversation
- Highly speculative connections
- General advice not tailored to specific issues
Example: Brief mention of wanting to "be healthier" = 18% confidence for "General Health Optimization"

MANDATORY CONFIDENCE VALIDATION:
- Review each score against the evidence
- Ask: "What specific conversation details support this confidence level?"
- If you can't justify the score with concrete evidence, LOWER it
- Remember: Healthcare professionals prefer conservative, honest assessments

CRITICAL RULES:
- NO medications, prescriptions, or medical treatments
- Focus on lifestyle, behavioral, and environmental solutions
- Solutions should be specific to issues mentioned in the conversation
- Each solution should target root causes identified in the conversation

SOLUTION CATEGORIES:
- lifestyle: Work-life balance, time management, environment changes
- stress: Relaxation techniques, stress reduction methods
- sleep: Sleep hygiene, bedtime routines, sleep environment
- nutrition: Dietary changes, meal timing, hydration
- exercise: Physical activity, movement, stretching
- mental_health: Mindfulness, meditation, emotional wellness

CONVERSATION CONTEXT:
${conversationText}

EXISTING SOLUTIONS (avoid duplicating):
${existingSolutionTexts.join('\n')}

Based on the conversation, identify specific problems mentioned and suggest 3-5 practical, actionable holistic solutions. For each solution:

1. Be specific to issues mentioned in conversation
2. Include confidence level (0.1-0.9) based on evidence strength guidelines above
3. Provide clear reasoning that explains the confidence level
4. Focus on actionable steps
5. Address root causes when possible

Return JSON array with this structure:
[
  {
    "solution": "Specific actionable solution based on conversation issues",
    "category": "lifestyle|stress|sleep|nutrition|exercise|mental_health", 
    "confidence": 0.85,
    "reasoning": "Why this solution addresses specific issues mentioned and confidence justification"
  }
]`;

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
          { role: 'user', content: `Analyze this conversation for holistic solutions: ${conversationText}` }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const solutionsText = aiResponse.choices[0].message.content;

    console.log("AI Solutions Response:", solutionsText);

    let solutions;
    try {
      // Handle markdown-wrapped JSON responses
      let cleanedText = solutionsText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      solutions = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", solutionsText);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(solutions)) {
      throw new Error('AI response is not an array');
    }

    // Validate and clean solutions
    const validSolutions = solutions.filter(solution => 
      solution.solution && 
      solution.category && 
      typeof solution.confidence === 'number' &&
      ['lifestyle', 'stress', 'sleep', 'nutrition', 'exercise', 'mental_health'].includes(solution.category)
    ).map(solution => ({
      ...solution,
      confidence: Math.max(0.1, Math.min(0.9, solution.confidence))
    }));

    // Check for confidence clustering and reject if too many high confidence scores
    const highConfidenceCount = validSolutions.filter(s => s.confidence >= 0.8).length;
    const totalSolutions = validSolutions.length;
    
    if (totalSolutions > 2 && highConfidenceCount / totalSolutions > 0.4) {
      console.log("Confidence distribution validation failed: too many high confidence scores");
      console.log("Confidence scores:", validSolutions.map(s => s.confidence));
      throw new Error('AI generated unrealistic confidence distribution - retrying with stricter guidelines');
    }

    console.log("Valid solutions found:", validSolutions.length);
    console.log("Confidence distribution:", validSolutions.map(s => ({ solution: s.solution.substring(0, 50) + '...', confidence: s.confidence })));

    if (validSolutions.length === 0) {
      console.log("No valid solutions generated");
      return new Response(JSON.stringify({ solutions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete existing solutions for this conversation
    await supabase
      .from('conversation_solutions')
      .delete()
      .eq('conversation_id', conversation_id);

    // Insert new solutions
    const solutionsToInsert = validSolutions.map(solution => ({
      conversation_id,
      patient_id,
      user_id: user.id,
      solution: solution.solution,
      category: solution.category,
      confidence: solution.confidence,
      reasoning: solution.reasoning || ''
    }));

    const { error: insertError } = await supabase
      .from('conversation_solutions')
      .insert(solutionsToInsert);

    if (insertError) {
      console.error("Failed to insert solutions:", insertError);
      throw new Error('Failed to save solutions to database');
    }

    console.log(`Successfully generated and stored ${validSolutions.length} solutions`);

    return new Response(JSON.stringify({ 
      solutions: validSolutions,
      count: validSolutions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-conversation-solutions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      solutions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});