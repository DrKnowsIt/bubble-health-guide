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

    const systemPrompt = `You are a medical intake AI that generates the next logical question based on the conversation so far. 

CORE INSTRUCTIONS:
1. Read the conversation history carefully - what questions were already asked and what the user selected
2. Generate the next logical medical question that naturally follows from what's been discussed
3. NEVER repeat or ask about topics already covered in the conversation
4. Ask specific, medically-relevant questions that help understand the user's health concerns

QUESTION REQUIREMENTS:
- Build naturally on what the user has already shared
- Focus on gathering new, relevant medical information
- Be specific and contextually appropriate
- Generate 5 specific response options + "I have other symptoms as well" as the 6th option

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "question": "Next logical question based on conversation context",
  "options": ["Specific option 1", "Specific option 2", "Specific option 3", "Specific option 4", "Specific option 5", "I have other symptoms as well"]
}`;

    const userPrompt = `Conversation History:
${fullContext}

Based on this conversation history, what should the next logical question be? Generate a question that explores new information not already covered in the conversation above.`;

    console.log('Making OpenAI API call with model gpt-5-mini-2025-08-07');
    
    // Add timeout to prevent hanging requests - reduced for faster responses
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07', // Faster model for simple question generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 800, // Increased for GPT-5-mini reasoning tokens
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response data:', JSON.stringify(data, null, 2));
    
    const content = data.choices?.[0]?.message?.content;

    if (!content || content.trim() === '') {
      console.error('No content in OpenAI response. Full data:', JSON.stringify(data, null, 2));
      console.error('Finish reason:', data.choices?.[0]?.finish_reason);
      
      // Check if it's a length issue
      if (data.choices?.[0]?.finish_reason === 'length') {
        console.error('Response was truncated due to length limit');
        
        // Retry with higher token limit
        console.log('Retrying with increased token limit...');
        const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini-2025-08-07',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_completion_tokens: 1200, // Higher limit for retry
            stream: false
          }),
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryContent = retryData.choices?.[0]?.message?.content;
          
          if (retryContent && retryContent.trim() !== '') {
            console.log('Retry successful with content:', retryContent);
            try {
              const retryQuestionData = JSON.parse(retryContent);
              if (retryQuestionData.question && Array.isArray(retryQuestionData.options)) {
                return new Response(JSON.stringify(retryQuestionData), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            } catch (retryParseError) {
              console.error('Failed to parse retry response:', retryContent);
            }
          }
        }
        
        throw new Error('Response truncated even after retry - using fallback');
      }
      
      throw new Error('No content received from OpenAI');
    }
    
    console.log('Generated content from OpenAI:', content);

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
    
    // Get anatomy context from request for fallback
    const { anatomyContext: fallbackAnatomyContext } = await req.json().catch(() => ({ anatomyContext: null }));
    
    // Create anatomy-aware fallback based on selected anatomy
    let fallbackQuestion;
    
    if (fallbackAnatomyContext && fallbackAnatomyContext.includes('anatomy')) {
      // Extract anatomy areas from context for more relevant fallback
      const anatomyMatch = fallbackAnatomyContext.match(/Body areas of interest: ([^.]+)/);
      const selectedAreas = anatomyMatch ? anatomyMatch[1].split(', ') : [];
      
      if (selectedAreas.length > 0) {
        const primaryArea = selectedAreas[0].toLowerCase();
        
        // Create anatomy-specific fallback questions
        if (primaryArea.includes('head') || primaryArea.includes('brain')) {
          fallbackQuestion = {
            question: "What symptoms are you experiencing in your head area?",
options: [
              "Headaches or head pain",
              "Dizziness or balance issues",
              "Memory or concentration problems",
              "Vision or hearing changes",
              "Sleep disturbances",
              "I have other symptoms as well"
            ]
          };
        } else if (primaryArea.includes('chest') || primaryArea.includes('heart')) {
          fallbackQuestion = {
            question: "What are you noticing with your chest or breathing?",
options: [
              "Chest pain or discomfort",
              "Shortness of breath",
              "Heart rhythm changes",
              "Coughing or wheezing",
              "Fatigue with activity",
              "I have other symptoms as well"
            ]
          };
        } else if (primaryArea.includes('stomach') || primaryArea.includes('abdomen')) {
          fallbackQuestion = {
            question: "How would you describe your stomach or digestive symptoms?",
options: [
              "Stomach pain or cramping",
              "Nausea or vomiting",
              "Changes in bowel habits",
              "Bloating or gas",
              "Loss of appetite",
              "I have other symptoms as well"
            ]
          };
        } else {
          fallbackQuestion = {
            question: `What symptoms are you experiencing in the ${primaryArea} area?`,
options: [
              "Pain or discomfort",
              "Swelling or changes in appearance",
              "Limited movement or function",
              "Numbness or tingling",
              "Changes from normal",
              "I have other symptoms as well"
            ]
          };
        }
      } else {
        fallbackQuestion = {
          question: "What brings you here today?",
options: [
            "Pain or discomfort",
            "Changes in how I feel",
            "Digestive symptoms",
            "Sleep or energy issues",
            "Mood changes",
            "I have other symptoms as well"
          ]
        };
      }
    } else {
      // Generic fallback when no anatomy context
      fallbackQuestion = {
        question: "What symptoms are you experiencing today?",
options: [
          "Pain or discomfort",
          "Changes in how I feel",
          "Stomach or digestive symptoms",
          "Sleep problems",
          "Mood or energy changes", 
          "I have other symptoms as well"
        ]
      };
    }

    return new Response(JSON.stringify(fallbackQuestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});