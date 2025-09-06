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

CRITICAL INSTRUCTIONS:
1. CAREFULLY READ the full conversation history - note EXACTLY what questions were asked and what answers were given
2. NEVER ask similar or related questions to ones already covered
3. Generate a completely NEW question that explores DIFFERENT medical information
4. Build on the user's specific responses to dive deeper into new areas

EXAMPLES OF WHAT NOT TO DO:
- If "Which best describes symptoms on front of head?" was asked, do NOT ask "What symptoms are you having on forehead/scalp?"
- If headache questions were covered, move to timing, triggers, associated symptoms, or completely different areas
- If location was discussed, ask about timing, severity, quality, or triggers instead

QUESTION REQUIREMENTS:
- Must explore completely NEW medical territory not covered in conversation
- Should logically build on user's previous specific answers
- Focus on: timing, triggers, severity, quality, associated symptoms, impact on daily life
- Generate 5 specific response options + "I have other symptoms as well" as the 6th option

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "question": "Next logical question exploring NEW information",
  "options": ["Specific option 1", "Specific option 2", "Specific option 3", "Specific option 4", "Specific option 5", "I have other symptoms as well"]
}`;

    const userPrompt = `Conversation History:
${fullContext}

Based on this conversation history, what should the next logical question be? Generate a question that explores new information not already covered in the conversation above.`;

    console.log('Making OpenAI API call with model gpt-4o-mini');
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // More reliable model for question generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500, // Sufficient for question generation
        temperature: 0.7, // Add some creativity
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
        
        // Retry with fallback - don't retry with same model
        console.log('Using fallback due to length issue...');
        throw new Error('Response truncated - using fallback');
        
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
    
    // Get data from request for fallback
    const { anatomyContext: fallbackAnatomyContext, conversationPath: fallbackPath } = await req.json().catch(() => ({ 
      anatomyContext: null, 
      conversationPath: [] 
    }));
    
    // Extract previous questions to avoid duplicates
    const previousQuestions = (fallbackPath || []).map((item: any) => 
      (item.question?.question_text || 'Previous question').toLowerCase()
    );
    console.log('Fallback - avoiding questions:', previousQuestions);
    
    // Create anatomy-aware fallback based on selected anatomy
    let fallbackQuestion;
    
    if (fallbackAnatomyContext && fallbackAnatomyContext.includes('anatomy')) {
      // Extract anatomy areas from context for more relevant fallback
      const anatomyMatch = fallbackAnatomyContext.match(/Body areas of interest: ([^.]+)/);
      const selectedAreas = anatomyMatch ? anatomyMatch[1].split(', ') : [];
      
      if (selectedAreas.length > 0) {
        const primaryArea = selectedAreas[0].toLowerCase();
        
        // Create anatomy-specific fallback questions that avoid duplicates
        const headQuestions = [
          {
            question: "How long have these symptoms been present?",
            options: ["Less than 24 hours", "1-3 days", "1-2 weeks", "Several weeks", "Months or longer", "I have other symptoms as well"],
            keywords: ["long", "duration", "when", "started"]
          },
          {
            question: "What makes your symptoms better or worse?",
            options: ["Rest helps", "Movement makes it worse", "Certain positions help", "Medication helps", "Nothing seems to help", "I have other symptoms as well"],
            keywords: ["better", "worse", "helps", "triggers"]
          },
          {
            question: "What symptoms are you experiencing in your head area?",
            options: ["Headaches or head pain", "Dizziness or balance issues", "Memory or concentration problems", "Vision or hearing changes", "Sleep disturbances", "I have other symptoms as well"],
            keywords: ["symptoms", "experiencing", "head", "what"]
          }
        ];

        if (primaryArea.includes('head') || primaryArea.includes('brain')) {
          // Find first question not already asked
          for (const q of headQuestions) {
            const isAsked = previousQuestions.some(prev => 
              q.keywords.some(keyword => prev.includes(keyword))
            );
            if (!isAsked) {
              fallbackQuestion = { question: q.question, options: q.options };
              break;
            }
          }
          
          if (!fallbackQuestion) {
            fallbackQuestion = headQuestions[0]; // Use first as last resort
          }
        } else if (primaryArea.includes('chest') || primaryArea.includes('heart')) {
          const chestQuestions = [
            {
              question: "How long have you been experiencing chest symptoms?",
              options: ["Less than an hour", "A few hours", "1-2 days", "Several days", "Weeks or longer", "I have other symptoms as well"],
              keywords: ["long", "duration", "when"]
            },
            {
              question: "What are you noticing with your chest or breathing?",
              options: ["Chest pain or discomfort", "Shortness of breath", "Heart rhythm changes", "Coughing or wheezing", "Fatigue with activity", "I have other symptoms as well"],
              keywords: ["noticing", "chest", "breathing", "what"]
            }
          ];
          
          for (const q of chestQuestions) {
            const isAsked = previousQuestions.some(prev => 
              q.keywords.some(keyword => prev.includes(keyword))
            );
            if (!isAsked) {
              fallbackQuestion = { question: q.question, options: q.options };
              break;
            }
          }
          
          if (!fallbackQuestion) {
            fallbackQuestion = chestQuestions[1];
          }
        } else if (primaryArea.includes('stomach') || primaryArea.includes('abdomen')) {
          const abdominalQuestions = [
            {
              question: "When did your digestive symptoms start?",
              options: ["Within the last few hours", "Today", "A few days ago", "This week", "Longer than a week", "I have other symptoms as well"],
              keywords: ["when", "start", "began"]
            },
            {
              question: "How would you describe your stomach or digestive symptoms?",
              options: ["Stomach pain or cramping", "Nausea or vomiting", "Changes in bowel habits", "Bloating or gas", "Loss of appetite", "I have other symptoms as well"],
              keywords: ["describe", "stomach", "digestive", "symptoms"]
            }
          ];
          
          for (const q of abdominalQuestions) {
            const isAsked = previousQuestions.some(prev => 
              q.keywords.some(keyword => prev.includes(keyword))
            );
            if (!isAsked) {
              fallbackQuestion = { question: q.question, options: q.options };
              break;
            }
          }
          
          if (!fallbackQuestion) {
            fallbackQuestion = abdominalQuestions[1];
          }
        } else {
          const genericAreaQuestions = [
            {
              question: "How long have you been experiencing symptoms?",
              options: ["Less than 24 hours", "1-3 days", "About a week", "Several weeks", "Months", "I have other symptoms as well"],
              keywords: ["long", "experiencing", "duration"]
            },
            {
              question: `What symptoms are you experiencing in the ${primaryArea} area?`,
              options: ["Pain or discomfort", "Swelling or changes in appearance", "Limited movement or function", "Numbness or tingling", "Changes from normal", "I have other symptoms as well"],
              keywords: ["symptoms", "experiencing", "what"]
            }
          ];
          
          for (const q of genericAreaQuestions) {
            const isAsked = previousQuestions.some(prev => 
              q.keywords.some(keyword => prev.includes(keyword))
            );
            if (!isAsked) {
              fallbackQuestion = { question: q.question, options: q.options };
              break;
            }
          }
          
          if (!fallbackQuestion) {
            fallbackQuestion = genericAreaQuestions[1];
          }
        }
      } else {
        // No specific areas selected
        const generalQuestions = [
          {
            question: "When did these symptoms begin?",
            options: ["Today", "Yesterday", "A few days ago", "This week", "Longer ago", "I have other symptoms as well"],
            keywords: ["when", "begin", "start"]
          },
          {
            question: "What brings you here today?",
            options: ["Pain or discomfort", "Changes in how I feel", "Digestive symptoms", "Sleep or energy issues", "Mood changes", "I have other symptoms as well"],
            keywords: ["brings", "today", "what"]
          }
        ];
        
        for (const q of generalQuestions) {
          const isAsked = previousQuestions.some(prev => 
            q.keywords.some(keyword => prev.includes(keyword))
          );
          if (!isAsked) {
            fallbackQuestion = { question: q.question, options: q.options };
            break;
          }
        }
        
        if (!fallbackQuestion) {
          fallbackQuestion = generalQuestions[1];
        }
      }
    } else {
      // Generic fallback when no anatomy context - check for duplicates
      const genericQuestions = [
        {
          question: "When did your symptoms start?",
          options: ["Within the last few hours", "Today", "A few days ago", "This week", "Longer than a week", "I have other symptoms as well"],
          keywords: ["when", "start", "began"]
        },
        {
          question: "How would you rate the severity of your symptoms?",
          options: ["Mild discomfort", "Moderate concern", "Significant issue", "Severe problem", "Emergency level", "I have other symptoms as well"],
          keywords: ["rate", "severity", "how"]
        },
        {
          question: "What symptoms are you experiencing today?",
          options: ["Pain or discomfort", "Changes in how I feel", "Stomach or digestive symptoms", "Sleep problems", "Mood or energy changes", "I have other symptoms as well"],
          keywords: ["symptoms", "experiencing", "today", "what"]
        }
      ];
      
      for (const q of genericQuestions) {
        const isAsked = previousQuestions.some(prev => 
          q.keywords.some(keyword => prev.includes(keyword))
        );
        if (!isAsked) {
          fallbackQuestion = { question: q.question, options: q.options };
          break;
        }
      }
      
      if (!fallbackQuestion) {
        fallbackQuestion = genericQuestions[2]; // Last resort
      }
    }
    
    console.log('Using fallback question:', fallbackQuestion.question);

    return new Response(JSON.stringify(fallbackQuestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});