import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

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
    const { message, conversation_history = [], patient_id, conversation_id, image_url } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const grokApiKey = Deno.env.get('GROK_API_KEY');
    if (!grokApiKey) {
      return new Response(
        JSON.stringify({ error: 'Grok API key not configured' }),
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
    
    const user_id = userData.user.id;

    // Get user subscription tier and status
    const { data: subscription } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', user_id)
      .single();

    const subscriptionTier = subscription?.subscription_tier || 'basic';
    const isSubscribed = subscription?.subscribed === true;

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
        comprehensiveHealthReport = `\n\nCOMPREHENSIVE HEALTH REPORT (Latest Analysis):
Overall Status: ${healthReport.overall_health_status}
Priority Level: ${healthReport.priority_level}

Key Health Concerns:
${(healthReport.key_concerns || []).map(c => `- ${c}`).join('\n')}

Recommendations:
${(healthReport.recommendations || []).map(r => `- ${r}`).join('\n')}

Report Summary:
${healthReport.report_summary}

Confidence Score: ${healthReport.confidence_score ? Math.round(healthReport.confidence_score * 100) : 0}%
Last Updated: ${new Date(healthReport.updated_at).toLocaleDateString()}

Note: This comprehensive report analyzes all health data together and provides holistic insights.`;
      }

      // Get health records
      const { data: allHealthRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      console.log('🎯 Patient selected:', patient.first_name, patient.last_name, 'ID:', patient.id);
      console.log('📝 Patient context being used for AI response generation');
      
      // Build comprehensive patient context
      const patientAge = patient.date_of_birth 
        ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      patientContext = `
PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
- Gender: ${patient.gender || 'Not specified'}
- Relationship: ${patient.relationship}
- Primary User: ${patient.is_primary ? 'Yes' : 'No'}`;

      // Build health records context
      let healthRecordsText = '\n\nHEALTH RECORDS:';
      if (allHealthRecords?.length) {
        healthRecordsText += '\n\nRECENT HEALTH RECORDS:';
        allHealthRecords.slice(0, 5).forEach(record => {
          healthRecordsText += `\n- ${record.title} (${record.record_type}) - ${new Date(record.created_at).toLocaleDateString()}`;
          if (record.data) {
            const dataStr = JSON.stringify(record.data).substring(0, 100);
            healthRecordsText += `\n  Brief: ${dataStr}${dataStr.length >= 100 ? '...' : ''}`;
          }
        });
        
        if (allHealthRecords.length > 5) {
          healthRecordsText += `\n  ... and ${allHealthRecords.length - 5} more records available`;
        }
      } else {
        healthRecordsText += '\n\nNo health records available';
      }

      patientContext += healthRecordsText;

      // Build health forms context - Include ALL health record types for comprehensive AI analysis
      const healthForms = allHealthRecords || [];
      
      if (healthForms.length > 0) {
        healthFormsContext = '\n\nHEALTH FORMS & RECORDS DATA:';
        healthForms.slice(0, 10).forEach(form => {
          healthFormsContext += `\n- ${form.title} (${form.record_type}): `;
          if (form.data && typeof form.data === 'object') {
            const dataStr = JSON.stringify(form.data);
            healthFormsContext += dataStr.length > 300 ? `${dataStr.substring(0, 300)}...` : dataStr;
          } else {
            healthFormsContext += 'No detailed data';
          }
          healthFormsContext += ` [Updated: ${new Date(form.updated_at).toLocaleDateString()}]`;
        });
        
        if (healthForms.length > 10) {
          healthFormsContext += `\n  ... and ${healthForms.length - 10} more health records available`;
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

    // Build comprehensive system prompt with current date/time
    const currentDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    let systemPrompt = `You are DrKnowsIt, a conversational AI health assistant. Keep responses SHORT and natural - like a quick chat with a friend who happens to know about health.

CURRENT DATE & TIME: ${currentDateTime} (UTC)

${comprehensiveHealthReport}
${patientContext}${healthFormsContext}

CRITICAL COMMUNICATION RULES:
- Don't assume worst case scenario right away - user may be overexaggerating
- Consider anxiety, stress, mental health factors first when symptoms align
- Always ask questions to increase confidence
- If confidence isn't increasing, shift approach to explore other causes
- Keep conversations medically focused unless non-medical relates to mental health

CONVERSATION STYLE:
- 1-2 sentences maximum
- Ask ONE simple follow-up question  
- Be conversational and natural
- No medical jargon or disclaimers

EXAMPLES:
User: "My knee hurts when I walk"
You: "That sounds uncomfortable. What kind of pain is it - sharp, dull, or aching?"

User: "I have a headache"  
You: "How long have you had it?"

Remember: Just have a natural conversation to understand their situation better.`;


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

    console.log('Sending request to Grok API with', messages.length, 'messages');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      
      // Enhanced error handling with specific error messages
      let userFriendlyMessage = 'I encountered an error while processing your request. You can try asking your question again.';
      
      if (response.status === 401) {
        userFriendlyMessage = 'Authentication error with AI service. Please contact support.';
        console.error('Grok API authentication failed - check API key');
      } else if (response.status === 429) {
        userFriendlyMessage = 'AI service is busy. Please wait a moment and try again.';
      } else if (response.status === 400) {
        userFriendlyMessage = 'I had trouble understanding your request. Could you rephrase your question?';
        console.error('Grok API bad request:', errorText);
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
    console.log('Grok API response received');

    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response content from Grok AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the response - Grok now focuses only on conversation
    const cleanedResponse = aiResponse.trim();

    return new Response(
      JSON.stringify({ 
        response: cleanedResponse,
        model: 'grok-2',
        usage: data.usage
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