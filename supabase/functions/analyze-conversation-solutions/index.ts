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

    console.log("Analyzing conversation for holistic solutions:", recent_messages?.slice(0, 3).map(m => m.content).join(' '));

    // Get existing solutions to avoid duplicates
    const { data: existingSolutions } = await supabase
      .from('conversation_solutions')
      .select('solution')
      .eq('conversation_id', conversation_id);

    const existingSolutionTexts = existingSolutions?.map(s => s.solution) || [];

    // Build conversation context
    const conversationText = recent_messages?.map((msg: any) => 
      msg.type === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`
    ).join('\n') || '';

    // Create prompt for holistic solution analysis
    const systemPrompt = `You are a holistic wellness advisor analyzing a health conversation to suggest non-medical solutions.

STRICT CONFIDENCE CALIBRATION GUIDELINES:
You must calculate realistic confidence percentages based on ACTUAL EVIDENCE in the conversation. Avoid clustering around 90%.

CONFIDENCE DISTRIBUTION REQUIREMENTS:
- Most solutions should be in the 40-75% range
- Only use 80-90% confidence when there is EXPLICIT, DETAILED evidence
- Use 30-50% confidence for moderate evidence
- Use 10-35% confidence for weak or speculative connections
- NEVER default to high confidence without clear justification

HIGH CONFIDENCE (75-90%) - Use ONLY when ALL criteria met:
- Patient explicitly describes specific symptoms/problems with clear details
- Patient provides comprehensive context about triggers, timing, or circumstances  
- Multiple conversation exchanges confirm the same issue
- Solution directly addresses the exact problem mentioned with proven effectiveness
- Patient shows understanding/awareness of the connection
Example: "I can't sleep because I drink 3 cups of coffee after 6pm and scroll my phone in bed for hours" = 82% confidence for "Evening Caffeine Reduction + Digital Sunset Protocol"

MEDIUM CONFIDENCE (45-74%) - Most solutions should fall here:
- Patient mentions problems with some specific details
- Clear connection between conversation content and solution exists
- Solution addresses mentioned issues but may need refinement
- Some evidence of lifestyle factors contributing to problems
Example: "I'm always stressed at work and feel exhausted by evening" = 58% confidence for "Workplace Stress Management Techniques"

LOW CONFIDENCE (15-44%) - Use when evidence is limited:
- Vague or general mentions of wellness topics
- Indirect inference from conversation required
- Limited details about specific problems or circumstances
- Solution is beneficial but speculative for this specific case
Example: "I want to feel better overall" = 28% confidence for "Comprehensive Wellness Assessment"

VERY LOW CONFIDENCE (10-25%) - Use for highly speculative:
- Solution based on assumptions not supported by conversation
- General health advice not tailored to mentioned issues
- Minimal or no evidence in conversation to support the solution

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
      error: error.message,
      solutions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});