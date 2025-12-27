import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token tracking disabled for analysis functions - no limits applied

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_history = [], patient_id, conversation_id, image_url } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with caller's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    // Verify user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user_id = userData.user.id;

    // Check for existing conversations without episodes and auto-assign them
    if (conversation_id && patient_id) {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('health_episode_id')
        .eq('id', conversation_id)
        .single();
      
      // If conversation exists but has no episode, create a general episode for it
      if (existingConversation && !existingConversation.health_episode_id) {
        console.log('🔄 Auto-creating episode for existing conversation');
        
        // Create a general episode for this conversation
        const { data: newEpisode } = await supabase
          .from('health_episodes')
          .insert({
            user_id: user_id,
            patient_id: patient_id,
            episode_title: 'Previous Health Discussion',
            episode_description: 'Auto-created episode for existing conversation',
            episode_type: 'symptoms',
            start_date: new Date().toISOString().split('T')[0],
            status: 'active'
          })
          .select()
          .single();
        
        if (newEpisode) {
          // Link the conversation to the new episode
          await supabase
            .from('conversations')
            .update({ health_episode_id: newEpisode.id })
            .eq('id', conversation_id);
            
          console.log('✅ Linked conversation to new episode:', newEpisode.id);
        }
      }
    }
    
    // If conversation_id is provided, verify it belongs to the current patient
    if (conversation_id && patient_id) {
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('patient_id, user_id')
          .eq('id', conversation_id)
          .single();

        if (convErr || !convData || convData.patient_id !== patient_id || convData.user_id !== userData.user.id) {
          console.log('🚨 Conversation validation failed:', {
            conversationId: conversation_id,
            expectedPatientId: patient_id,
            actualPatientId: convData?.patient_id,
            expectedUserId: userData.user.id,
            actualUserId: convData?.user_id,
            error: convErr
          });
          return new Response(
            JSON.stringify({ error: 'Invalid conversation context' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

    // Get user subscription tier and status
    const { data: subscription } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', user_id)
      .single();

    const subscriptionTier = subscription?.subscription_tier || 'basic';
    const isSubscribed = subscription?.subscribed === true;

    // Token limits disabled for analysis functions - create admin client for usage tracking only
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Allow both basic and pro users to access AI chat
    if (!isSubscribed) {
      console.log('grok-chat access denied (requires subscription):', { user_id, subscriptionTier, isSubscribed });
      return new Response(
        JSON.stringify({
          error: 'AI chat requires an active subscription. Please upgrade to continue.',
          code: 'subscription_required'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const memoryEnabled = aiSettings?.memory_enabled ?? true;
    const personalizationLevel = aiSettings?.personalization_level || 'medium';

    // Get strategic health data and doctor notes
    const { data: dataPriorities } = await supabase
      .from('health_data_priorities')
      .select('*')
      .eq('subscription_tier', subscriptionTier);

    const { data: doctorNotes } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('patient_id', patient_id)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false })
      .limit(10);

    // Handle conversation history based on memory settings
    let effectiveHistory = [];
    if (memoryEnabled && conversation_id) {
      // Get recent messages from database
      const { data: dbMessages } = await supabase
        .from('messages')
        .select('type, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (dbMessages) {
        effectiveHistory = dbMessages.reverse();
      }
    } else {
      // Use provided conversation history
      effectiveHistory = conversation_history.slice(-6);
    }

    console.log('Effective history messages:', effectiveHistory.length, 'messages');
    console.log('Sample messages:', effectiveHistory.slice(0, 1));

    // Fetch patient data and health records if patient_id is provided
    let patientContext = '';
    let healthFormsContext = '';
    let comprehensiveHealthReport = '';
    let isPet = false;
    
    if (patient_id) {
      // Verify patient belongs to user via RLS (row will only exist if owned)
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .maybeSingle();

      if (!patient) {
        return new Response(
          JSON.stringify({ error: 'Patient not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set isPet flag based on patient data
      isPet = patient.is_pet === true;

      // Fetch comprehensive health report if available
      const { data: healthReport } = await supabase
        .from('comprehensive_health_reports')
        .select('*')
        .eq('user_id', user_id)
        .eq('patient_id', patient_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (healthReport) {
        // DRASTICALLY reduced comprehensive report to save tokens
        comprehensiveHealthReport = `\n\nHEALTH REPORT SUMMARY:
Status: ${healthReport.overall_health_status} (${healthReport.priority_level} priority)
Key Concerns: ${(healthReport.key_concerns || []).slice(0, 3).join(', ')}${(healthReport.key_concerns?.length || 0) > 3 ? '...' : ''}
Confidence: ${healthReport.confidence_score ? Math.round(healthReport.confidence_score * 100) : 0}%`;
      }

      // Get health records filtered by subscription tier
      const { data: allHealthRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      // Filter health records based on subscription tier
      let filteredHealthRecords = allHealthRecords || [];
      if (subscriptionTier === 'basic') {
        // Define allowed record types for basic tier
        const allowedBasicTypes = isPet ? [
          'pet_general_notes',
          'pet_basic_info',
          'pet_current_health',
          'pet_health_observations',
          'pet_veterinary_history',
          'pet_behavior_lifestyle',
          'pet_diet_nutrition',
          'pet_emergency_contacts'
        ] : [
          'general_health_notes',
          'personal_demographics', 
          'medical_history', 
          'vital_signs_current', 
          'patient_observations'
        ];
        
        filteredHealthRecords = allHealthRecords?.filter(record => 
          allowedBasicTypes.includes(record.record_type)
        ) || [];
        
        console.log(`🔒 Filtered health records for ${subscriptionTier} tier: ${filteredHealthRecords.length}/${allHealthRecords?.length || 0} records`);
      }

      console.log('🎯 Patient selected:', patient.first_name, patient.last_name, 'ID:', patient.id);
      console.log('📝 Patient context being used for AI response generation');
      
      // De-identify patient data before sending to external AI
      const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!;
      const deIdentifyResponse = await fetch(`${supabaseServiceUrl}/functions/v1/de-identify-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patient_id,
          patient_context: {
            first_name: patient.first_name,
            last_name: patient.last_name,
            date_of_birth: patient.date_of_birth,
            gender: patient.gender,
            relationship: patient.relationship,
            is_primary: patient.is_primary
          }
        }),
      });

      if (!deIdentifyResponse.ok) {
        console.error('Failed to de-identify patient data');
        throw new Error('Failed to de-identify patient data');
      }

      const deIdentifiedData = await deIdentifyResponse.json();
      console.log('Successfully de-identified patient data for AI processing');

      // Build HIPAA-compliant patient context using de-identified data
      patientContext = `
PATIENT PROFILE:
- Patient ID: ${deIdentifiedData.patient_token}
- Age Range: ${deIdentifiedData.age_range}
- Gender: ${patient.gender || 'Not specified'}
- Relationship: ${patient.relationship}
- Primary User: ${patient.is_primary ? 'Yes' : 'No'}`;

      // Build health records context using filtered records (optimized but not overly limited)
      let healthRecordsText = '\n\nHEALTH RECORDS:';
      if (filteredHealthRecords?.length) {
        healthRecordsText += `\n- ${filteredHealthRecords.length} records available`;
        
        // Balanced context for health records - not too limited but not overwhelming
        const contextHealthRecords = filteredHealthRecords
          .slice(0, 8) // Increased from 3 to 8 for better context
          .map(record => {
            const dataString = typeof record.data === 'string' 
              ? record.data 
              : JSON.stringify(record.data);
            
            // Smart summarization: keep important details, reduce repetitive content
            let summary = dataString;
            if (dataString.length > 200) {
              // Extract key information patterns
              const keyPatterns = /(?:symptoms?|diagnosis|medication|test|result|finding|concern|pain|issue|problem|treatment)[^.]*\./gi;
              const keyInfo = dataString.match(keyPatterns)?.slice(0, 3).join(' ') || '';
              summary = keyInfo || dataString.substring(0, 200) + '...';
            }
            
            return {
              type: record.record_type,
              title: record.title,
              summary,
              date: new Date(record.created_at).toLocaleDateString()
            };
          });

        contextHealthRecords.forEach(record => {
          healthRecordsText += `\n- ${record.title} (${record.date}) - ${record.summary}`;
        });
        
        if (filteredHealthRecords.length > 3) {
          healthRecordsText += `\n[${filteredHealthRecords.length - 3} more records omitted for brevity]`;
        }
      } else {
        healthRecordsText += '\nNone available';
      }

      patientContext += healthRecordsText;

      // Build health forms context - OPTIMIZED for token usage
      const healthForms = filteredHealthRecords || [];
      
      if (healthForms.length > 0) {
        healthFormsContext = `\n\nHEALTH DATA SUMMARY: ${healthForms.length} forms available`;
        // Only include very brief summaries to save massive tokens
        healthForms.slice(0, 5).forEach(form => {
          healthFormsContext += `\n- ${form.title}`;
          // Extremely limited data to prevent token explosion
          if (form.data && typeof form.data === 'object') {
            const dataStr = JSON.stringify(form.data);
            healthFormsContext += dataStr.length > 100 ? ` (${dataStr.substring(0, 100)}...)` : ` (${dataStr})`;
          }
        });
        
        if (healthForms.length > 5) {
          healthFormsContext += `\n[${healthForms.length - 5} more forms available]`;
        }
      }
    }

    // Build doctor notes context
    let doctorNotesContext = '';
    if (doctorNotes?.length) {
      const patternNotes = doctorNotes.filter(n => n.note_type === 'pattern').slice(0, 3);
      const concernNotes = doctorNotes.filter(n => n.note_type === 'concern').slice(0, 3);
      const preferenceNotes = doctorNotes.filter(n => n.note_type === 'preference').slice(0, 2);
      const insightNotes = doctorNotes.filter(n => n.note_type === 'insight').slice(0, 3);

      doctorNotesContext = '\n\nDOCTOR NOTES (AI Memory):';
      
      if (patternNotes.length > 0) {
        doctorNotesContext += '\n\nHealth Patterns:';
        patternNotes.forEach(note => {
          doctorNotesContext += `\n- ${note.title}: ${note.content}`;
        });
      }
      
      if (concernNotes.length > 0) {
        doctorNotesContext += '\n\nOngoing Concerns:';
        concernNotes.forEach(note => {
          doctorNotesContext += `\n- ${note.title}: ${note.content}`;
        });
      }
      
      if (preferenceNotes.length > 0) {
        doctorNotesContext += '\n\nUser Preferences:';
        preferenceNotes.forEach(note => {
          doctorNotesContext += `\n- ${note.title}: ${note.content}`;
        });
      }
      
      if (insightNotes.length > 0) {
        doctorNotesContext += '\n\nKey Insights:';
        insightNotes.forEach(note => {
          doctorNotesContext += `\n- ${note.title}: ${note.content}`;
        });
      }
    }

    // Build memory context if enabled
    let memoryContext = '';
    if (memoryEnabled && effectiveHistory.length > 0) {
      memoryContext = `\n\nCONVERSATION MEMORY (enabled):
- Previous conversation context available for reference
- Personalization level: ${personalizationLevel}
- ${effectiveHistory.length} previous messages in context`;
    } else if (!memoryEnabled) {
      memoryContext = '\n\nCONVERSATION MEMORY: Disabled by user preference';
    }

    // Enhanced Pain Assessment for Basic/Pro Users
    let painAssessmentPrompt = '';
    const lastMessage = message?.toLowerCase() || '';
    
    // Pain detection keywords
    const painKeywords = ['pain', 'hurt', 'ache', 'sore', 'tender', 'throb', 'sharp', 'dull', 'burning', 'stab'];
    const bodyParts = ['arm', 'leg', 'back', 'neck', 'head', 'chest', 'stomach', 'abdomen', 'shoulder', 'knee', 'ankle', 'wrist', 'elbow', 'hip'];
    
    const hasPainMention = painKeywords.some(keyword => lastMessage.includes(keyword));
    const hasBodyPartMention = bodyParts.some(part => lastMessage.includes(part));
    
    // For Basic/Pro users, add enhanced pain localization prompts
    if (isSubscribed && (subscriptionTier === 'basic' || subscriptionTier === 'pro') && hasPainMention && hasBodyPartMention) {
      painAssessmentPrompt = `
ENHANCED PAIN ASSESSMENT (Basic/Pro Feature):
If the user mentions pain in a general area (like "arm pain"), guide them through specific localization:
- Ask for EXACT location: "To help narrow down the cause, can you describe exactly where in your ${bodyParts.find(part => lastMessage.includes(part)) || 'affected area'} the pain is? (For arm: upper arm, elbow, forearm, wrist)"
- Suggest diagnostic movements: "Does the pain change when you move in certain ways? Try gently [specific movement] - does that increase or decrease the pain?"
- Ask about sensation type: "Is it a sharp, dull, throbbing, or burning sensation?"
- Inquire about patterns: "When is it worst? (morning, evening, during activity, at rest)"

HOLISTIC ANALYSIS INSTRUCTIONS:
- Consider interconnected causes (neck issues causing arm pain, heart conditions causing left arm pain, etc.)
- Reference health forms and conversation memory for broader context
- Look for patterns across different body systems
- Think beyond obvious symptoms to underlying causes
`;
    }

    // Build comprehensive system prompt with current date/time
    const currentDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    // Define conversation rules directly (since edge functions can't read external files)
    const petRules = [
      "Don't assume worst case scenario right away – pet owners may be over-exaggerating symptoms or anthropomorphizing normal pet behaviors",
      "Consider environmental changes, diet changes, stress from new situations, or routine disruptions first when symptoms align", 
      "Always ask questions about specific observations to increase confidence before leaning toward possibilities",
      "If confidence isn't increasing, shift approach to explore other causes like breed-specific issues, age-related changes, or environmental factors",
      "Keep conversations focused on observable pet behaviors, physical symptoms, and environmental factors",
      "When examining pet symptoms, look into any potential behavioral patterns, eating/drinking changes, or activity level shifts",
      "If the owner asks for solutions, suggest low-risk environmental or behavioral approaches first—but only as suggestions",
      "Always consider species-specific and breed-specific health predispositions when evaluating symptoms",
      "Never diagnose; instead, propose possibilities and uncertainties in plain language appropriate for pet health",
      "Get easy data first like the pet's environment, diet, routine, recent changes, etc. if it is unknown",
      "Escalate urgency only if clear red-flag symptoms appear (difficulty breathing, seizures, collapse, bloating in large dogs, inability to urinate, etc.); otherwise remain calm, curious, and supportive"
    ];

    const humanRules = [
      "Don't assume worst case scenario right away – the user may be slightly over-exaggerating symptoms",
      "Consider anxiety, stress, sleep debt, and burnout first when symptoms align (especially in workaholics or poor sleepers)",
      "Always ask questions to increase confidence before leaning toward possibilities",
      "If confidence isn't increasing, shift approach to explore other causes",
      "Keep conversations medically focused unless non-medical relates to mental health or lifestyle",
      "Never diagnose; instead, propose possibilities and uncertainties in plain language",
      "Get easy data first like the users environment, diet, lifestyle, etc.. if it is unknown",
      "Acknowledge emotions before digging deeper into symptoms when the user is distressed",
      "Escalate urgency only if clear red-flag symptoms appear; otherwise remain calm, curious, and supportive"
    ];

    const communicationRules = isPet ? petRules : humanRules;
    
    // Build conversation history string for the prompt
    const conversationHistory = effectiveHistory.map((msg: any) => 
      `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    let systemPrompt;
    if (isPet) {
      const rulesText = communicationRules
        .map(rule => `- ${rule}`)
        .join('\n');
      
      systemPrompt = `You are DrKnowsIt, a conversational AI pet health assistant. Keep responses SHORT and natural - like a quick chat with a friend who happens to know about pet health.

CURRENT DATE & TIME: ${currentDateTime} (UTC)

${painAssessmentPrompt}

${comprehensiveHealthReport}
${patientContext}${healthFormsContext}

CRITICAL COMMUNICATION RULES:
${rulesText}

CONVERSATION STYLE:
- 1-3 sentences maximum
- Ask ONE simple follow-up question most of the time unless the user is asking a question.
- Be conversational, bubbly, intelligent, and natural
- No medical jargon unless the user is curious about details
- No disclaimers

EXAMPLES:
User: "My dog seems lethargic and won't eat"
You: "How long has this been going on? Is your dog drinking water normally?"

User: "My cat is vomiting frequently"  
You: "When did this start, and what does the vomit look like?"

User: "My pet is limping on their back leg"
You: "Can you see any swelling or cuts on the paw? Is your pet putting any weight on it?"

**PRODUCT RECOMMENDATIONS:**
- You have access to Amazon product search via the search_amazon_products function
- When discussing treatments, solutions, or pet health recommendations, you MAY suggest relevant products
- Focus on: pet vitamins, supplements, natural remedies, wellness products, holistic items
- Only call the function when products would genuinely help (e.g., joint supplements, digestive aids, stress relief)
- Available categories: vitamins, supplements, pain-relief, sleep-aid, digestive-health, immune-support, stress-relief, fitness, nutrition
- Be helpful but not pushy - only recommend when it adds clear value to the conversation
- When you call the function, I'll provide product cards that the user can view on Amazon

Remember: Just have a natural conversation to understand their pet's situation better.`;
    } else {
      const rulesText = communicationRules
        .map(rule => `- ${rule}`)
        .join('\n');
        
      systemPrompt = `You are DrKnowsIt, a conversational AI health assistant. Keep responses SHORT and natural - like a quick chat with a friend who happens to know about health.

CURRENT DATE & TIME: ${currentDateTime} (UTC)

${comprehensiveHealthReport}
${patientContext}${healthFormsContext}

CRITICAL COMMUNICATION RULES:
${rulesText}

CONVERSATION STYLE:
- 1-3 sentences maximum
- Ask ONE simple follow-up question most of the time unless the user is asking a question.
- Be conversational, bubbly, intelligent, and natural
- No medical jargon unless the user is curious about details
- No disclaimers

EXAMPLES:
User: "My knee hurts when I walk"
You: "That sounds uncomfortable. What kind of pain is it - sharp, dull, or aching?"

User: "I have a headache"  
You: "How long have you had it?"

**PRODUCT RECOMMENDATIONS:**
- You have access to Amazon product search via the search_amazon_products function
- When discussing solutions, treatments, or health recommendations, you MAY suggest relevant products
- Focus on: vitamins, supplements, natural remedies, wellness products, holistic items
- Only call the function when products would genuinely help (e.g., vitamin deficiency, supplement needs, wellness support)
- Available categories: vitamins, supplements, pain-relief, sleep-aid, digestive-health, immune-support, stress-relief, fitness, nutrition
- Be helpful but not pushy - only recommend when it adds clear value to the conversation
- When you call the function, I'll provide product cards that the user can view on Amazon

Remember:
- You are a helpful medical AI assistant designed to support users with health-related questions
- Always be empathetic, professional, and supportive
- Provide accurate medical information but always remind users to consult healthcare professionals
- If discussing serious symptoms or conditions, encourage seeking medical attention
- Be conversational and warm while maintaining medical accuracy
- Ask clarifying questions when needed to better understand the user's situation
- ${memoryEnabled ? 'Use the conversation memory to provide personalized responses based on past interactions' : 'Treat each message independently without referencing past conversations'}

Current conversation context:
${conversationHistory}

User message: ${message}
${image_url ? `\n\nThe user has also shared an image: ${image_url}` : ''}`;
    }

    // Build messages array with effective conversation history
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Add effective conversation history (from database if memory enabled, or provided history)
      ...effectiveHistory.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Add current message with optional image
      (() => {
        const userMessage: any = {
          role: 'user',
          content: message
        };

        // Add image if provided
        if (image_url) {
          userMessage.content = [
            {
              type: "text",
              text: message
            },
            {
              type: "image_url",
              image_url: {
                url: image_url
              }
            }
          ];
        }

        return userMessage;
      })()
    ];

    console.log('Sending request to Lovable AI with', messages.length, 'messages');

    // Define tool for Amazon product search
    const tools = [{
      type: "function",
      function: {
        name: "search_amazon_products",
        description: "Search for relevant health products on Amazon (vitamins, supplements, holistic items, wellness products). Use when discussing treatments, solutions, or recommendations that could benefit from product suggestions. Only suggest when genuinely relevant.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Product category: vitamins, supplements, pain-relief, sleep-aid, digestive-health, immune-support, stress-relief, fitness, nutrition"
            },
            keywords: {
              type: "string",
              description: "Specific product keywords based on the health concern (e.g., 'vitamin D3', 'probiotic', 'magnesium glycinate')"
            }
          },
          required: ["category", "keywords"]
        }
      }
    }];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      // Enhanced error handling with specific error messages
      let userFriendlyMessage = 'I encountered an error while processing your request. You can try asking your question again.';
      
      if (response.status === 401) {
        userFriendlyMessage = 'Authentication error with AI service. Please contact support.';
        console.error('Lovable AI authentication failed - check API key');
      } else if (response.status === 429) {
        userFriendlyMessage = 'AI service is busy. Please wait a moment and try again.';
      } else if (response.status === 402) {
        userFriendlyMessage = 'AI credits exhausted. Please add credits to continue.';
      } else if (response.status === 400) {
        userFriendlyMessage = 'I had trouble understanding your request. Could you rephrase your question?';
        console.error('Lovable AI bad request:', errorText);
      } else if (response.status >= 500) {
        userFriendlyMessage = 'AI service is temporarily unavailable. Please try again in a few minutes.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          technical_details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Process the AI response and handle tool calls
    const responseMessage = data.choices[0]?.message;
    let responseText = responseMessage?.content || "I'm sorry, I couldn't generate a response.";
    let products = [];

    // Check if AI wants to call the product search tool
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.function.name === 'search_amazon_products') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('🛍️ AI requesting product search:', args);
          
          // Call amazon-product-search function
          const productResponse = await fetch(`${supabaseUrl}/functions/v1/amazon-product-search`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              solutionCategory: args.category,
              keywords: args.keywords.split(',').map((k: string) => k.trim())
            }),
          });

          if (productResponse.ok) {
            const productData = await productResponse.json();
            products = productData?.products || [];
            console.log('✅ Found products:', products.length);
            
            // If no content in response, add a default message
            if (!responseText || responseText.trim() === '') {
              responseText = "Here are some product recommendations that might help:";
            }
          }
        } catch (productError) {
          console.error('Error fetching products:', productError);
          // Continue without products if search fails
        }
      }
    }
    
    // Clean the response text and remove any image suggestions
    const cleanedResponse = responseText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[IMAGE_SUGGESTION:.*?\]/g, '')
      .trim();

    console.log('AI response generated successfully');
    
    // Token tracking disabled for analysis functions - calculate tokens for analytics only
    const inputTokens = data.usage?.prompt_tokens || message.length / 4; // Estimate if not provided
    const outputTokens = data.usage?.completion_tokens || cleanedResponse.length / 4; // Estimate if not provided
    const totalTokens = inputTokens + outputTokens;
    
    console.log(`Generated response using ${totalTokens} tokens for user ${user_id} (no limits applied)`);
    
    // No token limiting - analysis functions run without restrictions
    const timeout_triggered = false;
    
    // Still track usage for analytics (but gems are the primary rate limiting mechanism)
    try {
      await supabaseAdmin
        .from('ai_usage_tracking')
        .insert({
          user_id: user_id,
          patient_id: patient_id || null,
          function_name: 'grok-chat',
          model_used: 'gemini-2.5-flash',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost: 0, // Cost is now managed via gems
          request_type: 'chat',
          subscription_tier: subscriptionTier
        });
    } catch (error) {
      console.error('Error tracking usage (non-critical):', error);
    }
    
    return new Response(
      JSON.stringify({ 
        message: cleanedResponse,
        products: products.length > 0 ? products : undefined,
        usage: data.usage,
        tokens_used: totalTokens,
        timeout_triggered: timeout_triggered
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grok-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
