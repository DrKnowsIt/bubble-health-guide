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

    const systemPrompt = `You are an expert medical intake specialist with deep knowledge of logical conversation progression. 

🔍 MANDATORY CONVERSATION ANALYSIS PROCESS:
Before generating any question, you MUST:
1. READ AND UNDERSTAND every single question-answer pair in the conversation history
2. IDENTIFY which information categories have already been thoroughly explored 
3. DETERMINE what specific aspects are still completely unexplored
4. CHOOSE a question that explores genuinely NEW territory

📋 CONVERSATION HISTORY REVIEW CHECKLIST:
For EACH previous Q&A, ask yourself:
- What specific information was this question trying to gather?
- What category/type of information did this cover? 
- What aspect of the patient's condition was explored?
- How does this constraint what I can ask next?

🚫 ABSOLUTE PROHIBITION RULES:
- NEVER ask questions that gather the same TYPE of information as previous questions
- NEVER rephrase existing questions with different words
- NEVER ask about frequency if frequency was already covered (even with different wording)
- NEVER ask about pain description if pain was already described  
- NEVER ask about triggers if triggers were already discussed
- NEVER ask about impact if impact was already explored
- Different phrasing = STILL A DUPLICATE (e.g., "How often..." vs "When do you experience...")

🎯 INFORMATION CATEGORY FRAMEWORK:
1. LOCATION/SPECIFICITY: Exact body part, side, precise area affected
2. SYMPTOM DESCRIPTION: Type of sensation, quality, characteristics  
3. SEVERITY/INTENSITY: How bad, scale, interference level
4. TEMPORAL PATTERNS: Frequency, duration, timing, when it occurs
5. TRIGGERS/MODIFIERS: What makes it worse/better, associated activities
6. FUNCTIONAL IMPACT: Effect on daily life, sleep, work, relationships
7. ASSOCIATED SYMPTOMS: Other symptoms that occur together
8. CONTEXT/CIRCUMSTANCES: When it started, what else was happening
9. TREATMENT RESPONSE: What has helped or not helped
10. PATIENT PRIORITIES: What concerns them most, what they want help with

✅ QUESTION GENERATION STRATEGY:
1. ANALYZE: Which categories above have been covered vs unexplored?
2. IDENTIFY: What is the most logical next unexplored category?
3. VERIFY: Is this question genuinely different from ALL previous questions?
4. GENERATE: Create a question that explores completely new territory

🎪 ANATOMY-SPECIFIC FOCUS RULES:
When body areas are specified, ALL response options must be anatomically consistent:
- HEAD: forehead, temples, back of head, scalp, face, jaw, ears, eyes, nose, throat
- CHEST: upper/lower chest, ribs, sternum, heart area, lung area
- ABDOMEN: upper/lower abdomen, stomach area, sides, navel area  
- ARMS: shoulder, upper arm, elbow, forearm, wrist, hand, fingers
- LEGS: hip, thigh, knee, calf, ankle, foot, toes
- BACK: upper/lower back, spine, shoulder blades
- NECK: front/back/sides of neck, throat

💡 RESPONSE FORMAT REQUIREMENTS:
- "question": Must explore genuinely NEW information territory
- "options": Must be ANSWER CHOICES (what user would say), NOT questions
- Always end with "I have other concerns as well"
- Keep options under 15 words, conversational tone
- Maximum 10 total options

🔄 EXAMPLES OF PROPER PROGRESSION:
❌ WRONG: Q1: "How often do you experience pain?" → Q2: "When does this pain occur?"
✅ RIGHT: Q1: "How often do you experience pain?" → Q2: "What does the pain feel like?"

❌ WRONG: Q1: "What triggers your symptoms?" → Q2: "What makes your condition worse?"  
✅ RIGHT: Q1: "What triggers your symptoms?" → Q2: "How long do episodes typically last?"

Return ONLY valid JSON:
{
  "question": "Your completely new question here",
  "options": ["Answer choice 1", "Answer choice 2", "...", "I have other concerns as well"]
}`;

    const userPrompt = `🔍 CONVERSATION HISTORY TO ANALYZE:
${fullContext}

📝 COMPLETE LIST OF PREVIOUS QUESTIONS (NEVER REPEAT/REPHRASE ANY OF THESE):
${previousQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

🧠 MANDATORY STEP-BY-STEP ANALYSIS:

STEP 1: CATEGORY COVERAGE ANALYSIS
Review each previous Q&A and determine which information categories have been covered:
□ LOCATION/SPECIFICITY: Has exact body part/area been pinpointed?
□ SYMPTOM DESCRIPTION: Has the sensation/quality been described? 
□ SEVERITY/INTENSITY: Has the severity level been established?
□ TEMPORAL PATTERNS: Has frequency/timing been discussed?
□ TRIGGERS/MODIFIERS: Have aggravating factors been explored?
□ FUNCTIONAL IMPACT: Has effect on daily activities been covered?
□ ASSOCIATED SYMPTOMS: Have related symptoms been discussed?
□ CONTEXT/ONSET: Has when/how it started been explored?
□ TREATMENT HISTORY: Has what helps/doesn't help been discussed?
□ PATIENT PRIORITIES: Has what concerns them most been asked?

STEP 2: IDENTIFY GAPS
Which categories above have NOT been thoroughly explored yet?

STEP 3: LOGICAL PROGRESSION  
What is the most logical next category to explore given what we already know?

STEP 4: VERIFICATION
Before finalizing your question, double-check:
- Is this question genuinely different from ALL previous questions?
- Does it explore completely new information territory?
- Will it advance our understanding in a meaningful way?

🎯 GENERATE YOUR NEXT QUESTION:
Create a question that explores the most important UNCOVERED category, ensuring it's completely distinct from all previous questions.`;

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