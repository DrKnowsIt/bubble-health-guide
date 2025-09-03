import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageSearchIntent {
  shouldTrigger: boolean;
  searchTerms: string[];
  primarySearchTerm: string;
  confidence: number;
  intent: 'symptom_description' | 'educational_query' | 'comparison' | 'diagnosis_support';
  preferredAPI: 'clinical' | 'research' | 'both';
  reasoning: string;
  aiSuggestion?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing message for image search intent:', message);

    const systemPrompt = `You are a medical AI assistant that analyzes user messages to determine when medical images would be helpful and what search terms to use.

Analyze the user's message and determine:
1. Whether medical images would be helpful (shouldTrigger: boolean)
2. Generate 1-3 optimal search terms for medical image databases
3. Choose the primary search term (most specific and relevant)
4. Confidence level (0-100) - how certain you are that images would help
5. Intent category: symptom_description, educational_query, comparison, diagnosis_support
6. Preferred API: "clinical" for real patient images (ISIC Archive), "research" for educational/textbook images (NIH), "both" for comprehensive results
7. Brief reasoning for your decision
8. Optional AI suggestion for what the user might want to see

Guidelines:
- Trigger for: visible symptoms, skin conditions, anatomical questions, injury descriptions, pest bites, rashes, lesions
- Don't trigger for: general health advice, medication questions, purely internal symptoms without visual component
- For clinical API: use medical terminology (e.g., "arthropod bite reaction", "erythematous papule")
- For research API: use descriptive terms (e.g., "bed bug bites", "insect bite reaction")
- High confidence (80+) for clear visual symptoms, medium (50-79) for educational needs, low (30-49) for uncertain cases
- Don't trigger below 30 confidence

Examples:
- "I have red bumps from bed bug bites" → clinical API, high confidence, terms: ["arthropod bite reaction", "bed bug bites", "insect bite"]
- "What does melanoma look like?" → research API, medium confidence, terms: ["melanoma", "skin cancer", "malignant lesion"]
- "I feel tired all the time" → don't trigger (no visual component)

Respond with valid JSON only.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      
      // Fallback response for API failures
      return new Response(JSON.stringify({
        shouldTrigger: false,
        searchTerms: [],
        primarySearchTerm: '',
        confidence: 0,
        intent: 'symptom_description',
        preferredAPI: 'research',
        reasoning: 'OpenAI API unavailable, using fallback',
        error: 'AI analysis unavailable'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);
    
    let result: ImageSearchIntent;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError, content);
      
      // Fallback response for parsing failures
      return new Response(JSON.stringify({
        shouldTrigger: false,
        searchTerms: [],
        primarySearchTerm: '',
        confidence: 0,
        intent: 'symptom_description',
        preferredAPI: 'research',
        reasoning: 'Failed to parse AI response',
        error: 'AI analysis parsing failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and sanitize the response
    const sanitizedResult: ImageSearchIntent = {
      shouldTrigger: Boolean(result.shouldTrigger),
      searchTerms: Array.isArray(result.searchTerms) ? result.searchTerms.slice(0, 5) : [],
      primarySearchTerm: typeof result.primarySearchTerm === 'string' ? result.primarySearchTerm : '',
      confidence: Math.max(0, Math.min(100, Number(result.confidence) || 0)),
      intent: ['symptom_description', 'educational_query', 'comparison', 'diagnosis_support'].includes(result.intent) 
        ? result.intent as any : 'symptom_description',
      preferredAPI: ['clinical', 'research', 'both'].includes(result.preferredAPI) 
        ? result.preferredAPI as any : 'research',
      reasoning: typeof result.reasoning === 'string' ? result.reasoning : 'No reasoning provided',
      aiSuggestion: typeof result.aiSuggestion === 'string' ? result.aiSuggestion : undefined
    };

    console.log('Final analysis result:', sanitizedResult);

    return new Response(JSON.stringify(sanitizedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-image-search-intent function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      shouldTrigger: false,
      searchTerms: [],
      primarySearchTerm: '',
      confidence: 0,
      intent: 'symptom_description',
      preferredAPI: 'research',
      reasoning: 'System error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});