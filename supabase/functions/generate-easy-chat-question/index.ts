import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Removed similarity detection - using AI context awareness instead

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { conversationPath, patientId, anatomyContext } = await req.json();
    
    console.log('Generating question for conversation path:', conversationPath?.length || 0, 'responses');

    // Create context from previous responses and extract previous questions for deduplication
    console.log('Building context from conversation path:', conversationPath?.length || 0, 'responses');
    const previousQuestions = [];
    const context = conversationPath?.map((item: any, index: number) => {
      const questionText = item.question?.question_text || 'Previous question';
      previousQuestions.push(questionText.toLowerCase());
      console.log(`Context ${index + 1}: Q="${questionText}" A="${item.response}"`);
      return `Q: ${questionText}\nA: ${item.response}`;
    }).join('\n\n') || 'No previous context';
    console.log('Final context for AI:', context);
    console.log('Previous questions to avoid:', previousQuestions);

    // Add anatomy context if provided
    const fullContext = anatomyContext 
      ? `${anatomyContext}\n\nConversation history:\n${context}`
      : context;

    const systemPrompt = `You are a sophisticated medical intake AI that generates intelligent, progressive questions based on conversation flow. Your goal is to create ZERO DUPLICATE QUESTIONS while gathering comprehensive health information.

CRITICAL ANTI-DUPLICATION RULES:
1. CAREFULLY ANALYZE all previous questions to understand what has already been asked
2. NEVER ask semantically similar questions (e.g., "How long?" vs "When did this start?")
3. NEVER ask about the same topic area twice (e.g., multiple pain questions)
4. Generate questions that build logically on previous responses
5. If anatomy areas are specified in context, DO NOT ask about location - focus on other aspects

CONVERSATION FLOW INTELLIGENCE:
Follow this logical progression based on what hasn't been covered:
- Start: Chief complaint identification
- Then: Timing/onset details 
- Then: Symptom characteristics (quality, severity, patterns)
- Then: Triggers/aggravating factors
- Then: Associated symptoms
- Then: Impact on daily life
- Then: Previous treatments tried
- Then: Family/medical history relevance

QUESTION CATEGORIES (track what's been asked):
- Location: "Where do you feel...", "What part of your body..."
- Timing: "When did this start...", "How long have you..."
- Quality: "How would you describe...", "What does it feel like..."
- Severity: "How intense is...", "On a scale of..."
- Triggers: "What makes it worse...", "Does anything trigger..."
- Associated: "Do you have any other symptoms...", "Have you noticed..."
- Impact: "How does this affect...", "Can you still..."
- History: "Have you had this before...", "Any family history..."

ANTI-DUPLICATION ENFORCEMENT:
- Before generating a question, mentally categorize what's already been asked
- Choose from ONLY the categories NOT yet explored
- Ensure your question explores genuinely NEW medical territory
- Make questions specific and medically relevant, not generic

RESPONSE OPTIONS REQUIREMENTS:
- Generate 5 specific, medically-relevant response options
- Make options contextually appropriate to the specific question
- ALWAYS include "I have other concerns as well" as the 6th option for manual input
- Avoid generic options like "Yes/No" - be specific to the medical context

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "question": "Specific, medically-relevant question that hasn't been asked before",
  "options": ["Specific option 1", "Specific option 2", "Specific option 3", "Specific option 4", "Specific option 5", "I have other concerns as well"]
}`;

    const userPrompt = `Conversation History:
${fullContext}

Based on this conversation history, what should the next logical question be? Generate a question that explores new information not already covered in the conversation above.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let questionData;
    try {
      questionData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (!questionData.question || !Array.isArray(questionData.options)) {
      throw new Error('Invalid question format from AI');
    }

    // No longer using similarity detection - AI handles context awareness

    console.log('Generated question:', questionData.question);
    console.log('Options count:', questionData.options.length);

    return new Response(JSON.stringify(questionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating question:', error);
    
    // Fallback question for errors
    const fallbackQuestion = {
      question: "How would you describe your main health concern today?",
      options: [
        "Pain or discomfort",
        "Changes in how I feel",
        "Stomach or digestive discomfort",
        "Sleep problems",
        "Mood or energy changes", 
        "Skin or appearance concerns",
        "I have other concerns as well"
      ]
    };

    return new Response(JSON.stringify(fallbackQuestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});