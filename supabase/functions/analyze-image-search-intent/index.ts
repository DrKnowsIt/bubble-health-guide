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
    const { message, conversationContext } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Analyzing message for image search intent:', message);
    console.log('📋 Conversation context provided:', Array.isArray(conversationContext) ? conversationContext.length : 0, 'messages');

const systemPrompt = `You are a medical AI assistant that analyzes user messages and conversation context to determine when medical images would be helpful and what search terms to use.

CRITICAL: Medical images should ONLY be shown when highly confident (80+) and truly relevant to the current conversation.

Analyze the user's current message AND recent conversation context to determine:
1. Whether medical images would be helpful (shouldTrigger: boolean)
2. Generate 1-3 optimal search terms for clinical medical image databases
3. Choose the primary search term (most specific and relevant)
4. Confidence level (0-100) - how certain you are that images would help
5. Intent category: symptom_description, educational_query, comparison, diagnosis_support
6. Brief reasoning for your decision
7. Optional AI suggestion for what the user might want to see

STRICT TRIGGERING GUIDELINES:
- HIGH CONFIDENCE ONLY (80+): Clear visual symptoms currently being discussed, specific skin conditions, visible injuries
- MEDIUM CONFIDENCE (50-79): Educational questions about visual medical conditions when conversation is medically focused
- LOW CONFIDENCE (<50): Uncertain cases, off-topic conversations, non-visual symptoms
- NEVER TRIGGER for: general health advice, medication questions, purely internal symptoms, casual conversations, greetings, non-medical topics

CONVERSATION RELEVANCE CHECK:
- If recent conversation is about non-medical topics (general chat, greetings, other subjects), LOWER confidence significantly
- If conversation has shifted away from medical topics, don't trigger
- Only trigger if current message AND conversation context suggest medical visual content would be valuable
- If user is asking about something completely different from previous medical discussion, don't trigger

SEARCH TERM GUIDELINES:
- Only use clinical medical terminology for ISIC Archive database
- For insect/pest bites: use "arthropod bite reaction", "insect bite", "bite reaction"
- For skin conditions: use clinical terms like "dermatitis", "eczema", "psoriasis", "urticaria"
- For cancer concerns: use "melanoma", "nevus", "skin cancer", "carcinoma"
- For injuries: use "laceration", "contusion", "burn", "wound"

EXAMPLES:
- "I have red bumps from bed bug bites" (in medical conversation) → confidence: 85, terms: ["arthropod bite reaction", "insect bite"]
- "What does melanoma look like?" (in medical conversation) → confidence: 75, terms: ["melanoma", "nevus", "skin cancer"]
- "How are you today?" (after medical discussion) → confidence: 0, don't trigger (casual greeting)
- "I feel tired all the time" → confidence: 0, don't trigger (no visual component)
- "Thanks for the help with my rash, by the way what's the weather like?" → confidence: 0, don't trigger (topic changed)

Respond with valid JSON only.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation context if provided
    if (Array.isArray(conversationContext) && conversationContext.length > 0) {
      const contextMessage = `Recent conversation context (last ${conversationContext.length} messages):\n${conversationContext.join('\n---\n')}`;
      messages.push({ role: 'user', content: contextMessage });
      messages.push({ role: 'assistant', content: 'I understand the conversation context. Now analyze the current message:' });
    }

    // Add the current message to analyze
    messages.push({ role: 'user', content: `Current message to analyze: "${message}"` });

    console.log('🤖 Sending to OpenAI with', messages.length, 'messages');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 500,
        temperature: 0.2,
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
      preferredAPI: 'clinical',
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
      preferredAPI: 'clinical',
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
      preferredAPI: 'clinical', // Always use clinical API only
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
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      shouldTrigger: false,
      searchTerms: [],
      primarySearchTerm: '',
      confidence: 0,
      intent: 'symptom_description',
      preferredAPI: 'clinical',
      reasoning: 'System error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});