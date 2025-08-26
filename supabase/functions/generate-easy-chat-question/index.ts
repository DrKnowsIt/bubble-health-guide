import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// String similarity function to detect near-duplicate questions
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = Math.max(words1.length, words2.length);
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}

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

    const systemPrompt = `You are a medical intake specialist creating follow-up health questions. 
Generate a relevant health question based on the conversation history and any specified body areas of concern.

CRITICAL CONTEXT AWARENESS RULES:
- ABSOLUTELY NEVER ask the same or similar questions that have already been asked in the conversation history
- CAREFULLY review ALL PREVIOUS QUESTIONS to avoid any form of repetition or similarity
- Different phrasing of the same concept still counts as duplicate (e.g. "What causes pain?" vs "What triggers pain?")
- Progress the conversation logically through DISTINCT categories: location → description → severity → timing → triggers → impact  
- Each question must explore a COMPLETELY NEW aspect not yet covered
- If a category has been covered, move to the next uncovered category

QUESTION PROGRESSION STRATEGY (follow this order):
1. Location/Area (where specifically)
2. Description/Quality (what it feels like, type of sensation)  
3. Severity/Intensity (how bad, scale, impact on activities)
4. Timing/Frequency (when, how often, duration)
5. Triggers/Context (what makes it better/worse, associated factors)
6. Impact/Function (how it affects daily life, sleep, work, etc.)

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

PREVIOUS QUESTIONS ALREADY ASKED (DO NOT REPEAT OR REPHRASE):
${previousQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

STRICT DEDUPLICATION REQUIREMENTS:
1. NEVER ask questions similar to those listed above - even with different wording
2. NEVER ask about the same concept using different phrasing  
3. If body areas/anatomy are mentioned, ALL response options must relate ONLY to those areas
4. Follow progression: location → description → severity → timing → triggers → impact
5. Skip categories already covered and move to the next uncovered category

QUESTION CATEGORY ANALYSIS - determine which categories have been covered:
- Location: Has specific location/area been identified? 
- Description: Have symptoms/sensations been described?
- Severity: Has intensity/impact level been discussed?
- Timing: Have frequency/duration patterns been covered?
- Triggers: Have aggravating/relieving factors been explored?
- Impact: Has effect on daily activities/sleep been discussed?

Generate a question for the NEXT UNCOVERED CATEGORY that is completely different from all previous questions.`;

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

    // Check for duplicate questions (case-insensitive similarity check)
    const newQuestionLower = questionData.question.toLowerCase();
    const isDuplicate = previousQuestions.some(prevQ => {
      const similarity = calculateStringSimilarity(newQuestionLower, prevQ);
      return similarity > 0.7; // 70% similarity threshold
    });

    if (isDuplicate) {
      console.log('DUPLICATE DETECTED - Question too similar to previous ones, using fallback');
      // Instead of throwing error, use a fallback question from a curated list
      const fallbackQuestions = [
        {
          question: "Is there anything else about your symptoms you'd like to discuss?",
          options: ["Yes, I have more to share", "No, that covers it", "I'm not sure", "I have other concerns as well"]
        },
        {
          question: "How would you rate the overall impact on your daily life?", 
          options: ["Minimal impact", "Some disruption", "Significant impact", "Severe impact", "I have other concerns as well"]
        },
        {
          question: "What would you most like your doctor to know about your condition?",
          options: ["The severity of symptoms", "How long it's been going on", "What might be causing it", "Treatment options", "I have other concerns as well"]
        }
      ];
      
      // Select fallback based on conversation length to avoid repeating fallbacks
      const fallbackIndex = conversationPath.length % fallbackQuestions.length;
      questionData = fallbackQuestions[fallbackIndex];
      console.log('Using fallback question due to duplicate detection');
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