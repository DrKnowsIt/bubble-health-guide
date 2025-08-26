import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { conversation_context, patient_id, conversation_length } = await req.json();

    console.log('Evaluating Easy Chat completeness:', {
      patient_id,
      conversation_length,
      context_length: conversation_context?.length || 0
    });

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

    const systemPrompt = `You are a medical conversation evaluator that determines if an Easy Chat session has gathered enough meaningful health information to provide valuable topics for a doctor visit.

EVALUATION CRITERIA:

SHOULD COMPLETE (return true) if conversation has:
- At least 2-3 specific symptoms or health concerns mentioned
- Clear location/body area specificity 
- Symptom details (timing, severity, duration, triggers)
- Enough information to form actionable health topics for doctor discussion
- Patient has described their concerns with sufficient detail

SHOULD CONTINUE (return false) if conversation:
- Only has vague or general responses
- Lacks specific symptom details
- Responses are too brief or unclear
- Missing key information about timing, severity, or location
- Would benefit from more targeted questions to clarify concerns

CONVERSATION LENGTH FACTORS:
- After 3+ questions: Look for meaningful health content
- After 6+ questions: Be more likely to complete if any reasonable health topics exist
- After 8+ questions: Complete unless conversation is completely unhelpful

RESPONSE FORMAT (JSON only):
{
  "should_complete": boolean,
  "confidence_score": 0.0-1.0,
  "reasoning": "explanation of decision",
  "identified_topics_count": number,
  "conversation_quality": "excellent|good|fair|poor"
}

Analyze this Easy Chat conversation:
${conversation_context}`;

    console.log('Sending completion evaluation request to OpenAI...');

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
          { role: 'user', content: `Evaluate if this Easy Chat conversation (${conversation_length} questions) is ready to complete: ${conversation_context}` }
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to evaluate conversation completeness',
          should_complete: conversation_length >= 7 // Fallback logic
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No response from OpenAI');
      return new Response(
        JSON.stringify({ 
          error: 'No response from AI',
          should_complete: conversation_length >= 7 // Fallback
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let evaluationData;
    try {
      evaluationData = JSON.parse(aiResponse);
      console.log('Completeness evaluation:', evaluationData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw response:', aiResponse);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from AI',
          should_complete: conversation_length >= 7 // Fallback
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply safety checks
    const shouldComplete = evaluationData.should_complete || false;
    const confidenceScore = Math.min(Math.max(evaluationData.confidence_score || 0.5, 0), 1);
    
    // Override logic: if conversation is very long, force completion
    const forceComplete = conversation_length >= 10;
    
    console.log(`Evaluation result: should_complete=${shouldComplete}, confidence=${confidenceScore}, force_complete=${forceComplete}`);

    return new Response(
      JSON.stringify({ 
        should_complete: shouldComplete || forceComplete,
        confidence_score: confidenceScore,
        reasoning: evaluationData.reasoning || 'Based on conversation analysis',
        identified_topics_count: evaluationData.identified_topics_count || 0,
        conversation_quality: evaluationData.conversation_quality || 'fair',
        force_completed: forceComplete,
        conversation_length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-easy-chat-completeness function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        should_complete: true // Fallback to complete on error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});