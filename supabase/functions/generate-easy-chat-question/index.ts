import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Create context from previous responses
    const context = conversationPath?.map((item: any) => 
      `Q: ${item.question?.question_text || 'Previous question'}\nA: ${item.response}`
    ).join('\n\n') || 'No previous context';

    // Add anatomy context if provided
    const fullContext = anatomyContext 
      ? `${anatomyContext}\n\nConversation history:\n${context}`
      : context;

    const systemPrompt = `You are a medical intake specialist creating follow-up health questions. 
Generate a relevant health question based on the conversation history and any specified body areas of concern.

CRITICAL ANATOMY RULES:
- When specific body areas are mentioned (head, chest, abdomen, arms, legs, etc.), ALL options must relate ONLY to that anatomy area
- NEVER suggest options for different body parts than what was selected
- Focus on sub-areas, symptoms, and characteristics specific to the selected anatomy

ANATOMY-SPECIFIC GUIDELINES:
HEAD: Focus on forehead, temples, back of head, scalp, face, jaw, ears, eyes, nose, throat
CHEST: Focus on upper chest, lower chest, ribs, sternum, heart area, lung area
ABDOMEN: Focus on upper abdomen, lower abdomen, stomach area, sides, navel area
ARMS: Focus on shoulder, upper arm, elbow, forearm, wrist, hand, fingers
LEGS: Focus on hip, thigh, knee, calf, ankle, foot, toes
BACK: Focus on upper back, lower back, spine, shoulder blades
NECK: Focus on front of neck, back of neck, sides, throat

CRITICAL: The "options" array must contain ANSWER CHOICES that users can select as their response, NOT additional questions.

Guidelines:
- Generate one focused follow-up question based on previous responses and body areas mentioned
- The "options" array must contain what users would SAY/SELECT as their answer to your question
- If anatomy is specified, tailor ALL answer options to that specific body area - never mix body parts
- Always include "I have other concerns as well" as the last option
- Keep answer options under 15 words each
- Make answer options conversational and easy to understand
- Cover location, symptoms, timeline, severity, or related concerns within the specified anatomy
- Maximum 10 total answer options
- Prioritize the selected anatomy over general questions

EXAMPLES OF CORRECT FORMAT:
Question: "Can you describe any pain in your chest area?"
Options: ["Sharp stabbing pain", "Dull ache", "Burning sensation", "Pressure feeling", "No pain, just discomfort", "I have other concerns as well"]

Question: "Where specifically in your head do you feel discomfort?"
Options: ["Forehead area", "Back of my head", "Temples", "Top of my head", "Around my eyes", "Jaw area", "I have other concerns as well"]

Return ONLY a JSON object with this structure:
{
  "question": "Your follow-up question here",
  "options": [
    "User answer choice 1",
    "User answer choice 2", 
    "...",
    "I have other concerns as well"
  ]
}`;

    const userPrompt = `Based on the following context, generate the next appropriate health question:

${fullContext}

IMPORTANT: If specific body areas/anatomy are mentioned in the context, ensure ALL response options relate ONLY to those body areas. Do not suggest options for different body parts. Generate a follow-up question that helps gather more specific health information within the specified anatomy.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
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
        "Digestive issues",
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