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
    const { message, conversation_history = [], patient_id, user_id, conversation_id, image_url } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user subscription tier
    const { data: subscription } = await supabase
      .from('subscribers')
      .select('subscription_tier')
      .eq('user_id', user_id)
      .single();

    const subscriptionTier = subscription?.subscription_tier || 'basic';

    // Get strategic referencing data
    const { data: dataPriorities } = await supabase
      .from('health_data_priorities')
      .select('*')
      .eq('user_id', user_id)
      .or(`subscription_tier.is.null,subscription_tier.eq.${subscriptionTier}`);

    const { data: doctorNotes } = await supabase
      .from('doctor_notes')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get AI settings for the user
    const { data: aiSettings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const memoryEnabled = aiSettings?.memory_enabled ?? true;
    const personalizationLevel = aiSettings?.personalization_level ?? 'medium';

    // Fetch conversation history from database if memory is enabled and conversation_id is provided
    let dbConversationHistory = [];
    if (memoryEnabled && conversation_id) {
      const { data: messages } = await supabase
        .from('messages')
        .select('type, content, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(20); // Last 20 messages for context

      if (messages) {
        dbConversationHistory = messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.created_at
        }));
      }
    }

    // Use database conversation history if available, otherwise fall back to provided history
    const effectiveHistory = dbConversationHistory.length > 0 ? dbConversationHistory : conversation_history;

    // Fetch patient data and health records if patient_id is provided
    let patientContext = '';
    let healthFormsContext = '';
    let currentDiagnoses = [];
    
    if (patient_id && user_id) {
      // Verify patient belongs to user
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', user_id)
        .single();

      if (!patient) {
        return new Response(
          JSON.stringify({ error: 'Patient not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get strategic health data based on subscription and priorities
      const { data: healthRecordSummaries } = await supabase
        .from('health_records')
        .select(`
          id,
          title,
          record_type,
          data,
          file_url,
          created_at,
          health_record_summaries!inner(
            id,
            summary_text,
            priority_level
          )
        `)
        .eq('patient_id', patient_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      // Get full health records for fallback
      const { data: allHealthRecords } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      currentDiagnoses = patient.probable_diagnoses || [];
      
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

      // Build strategic health context based on subscription and priorities
      let healthRecordsText = '\n\nHEALTH RECORDS:';
      
      // Organize priorities
      const alwaysPriorities = (dataPriorities || []).filter(p => p.priority_level === 'always');
      const conditionalPriorities = (dataPriorities || []).filter(p => p.priority_level === 'conditional');
      
      // Check if we should include conditional data
      const shouldIncludeConditional = subscriptionTier === 'pro' || 
        (subscriptionTier === 'basic' && conditionalPriorities.length > 0);

      // Process summarized records with strategic priority
      if (healthRecordSummaries?.length) {
        const alwaysSummaries = healthRecordSummaries.filter(r => 
          r.health_record_summaries[0]?.priority_level === 'always'
        );
        const conditionalSummaries = healthRecordSummaries.filter(r => 
          r.health_record_summaries[0]?.priority_level === 'conditional'
        );
        const normalSummaries = healthRecordSummaries.filter(r => 
          r.health_record_summaries[0]?.priority_level === 'normal'
        );

        // Always include high-priority summaries
        if (alwaysSummaries.length > 0) {
          healthRecordsText += '\n\nALWAYS-REFERENCE DATA:';
          alwaysSummaries.forEach(record => {
            const summary = record.health_record_summaries[0];
            healthRecordsText += `\n- ${record.title} (${record.record_type}): ${summary.summary_text}`;
          });
        }

        // Include conditional data based on subscription
        if (shouldIncludeConditional && conditionalSummaries.length > 0) {
          healthRecordsText += '\n\nCONDITIONAL-REFERENCE DATA:';
          conditionalSummaries.forEach(record => {
            const summary = record.health_record_summaries[0];
            healthRecordsText += `\n- ${record.title} (${record.record_type}): ${summary.summary_text}`;
          });
        }

        // Include limited normal summaries
        if (normalSummaries.length > 0) {
          healthRecordsText += '\n\nADDITIONAL HEALTH DATA (limited):';
          normalSummaries.slice(0, 3).forEach(record => {
            const summary = record.health_record_summaries[0];
            healthRecordsText += `\n- ${record.title}: ${summary.summary_text}`;
          });
          
          if (normalSummaries.length > 3) {
            healthRecordsText += `\n  ... and ${normalSummaries.length - 3} more records available`;
          }
        }
      } else if (allHealthRecords?.length) {
        // Fallback to full records if no summaries available
        healthRecordsText += '\n\nLIMITED HEALTH RECORDS (no summaries available):';
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

      // Build health forms context strategically
      const healthForms = allHealthRecords?.filter(r => 
        ['symptom_tracker', 'medication_log', 'vital_signs', 'mood_tracker', 'pain_tracker', 'sleep_tracker'].includes(r.record_type)
      ) || [];
      
      if (healthForms.length > 0) {
        healthFormsContext = '\n\nHEALTH FORMS DATA:';
        healthForms.slice(0, 3).forEach(form => {
          healthFormsContext += `\n- ${form.title}: ${form.data ? JSON.stringify(form.data).substring(0, 200) : 'No data'}`;
        });
        
        if (healthForms.length > 3) {
          healthFormsContext += `\n  ... and ${healthForms.length - 3} more forms available`;
        }
      }

      if (currentDiagnoses.length > 0) {
        patientContext += `\n\nCURRENT PROBABLE DIAGNOSES: ${currentDiagnoses.map(d => `${d.diagnosis} (${Math.round(d.confidence * 100)}% confidence - ${d.reasoning})`).join(', ')}`;
      } else {
        patientContext += '\n\nCURRENT PROBABLE DIAGNOSES: None yet';
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

    // Build comprehensive system prompt
    let systemPrompt = `You are DrKnowsIt, an AI health preparation assistant. You help users organize symptoms and prepare thoughtful questions for their healthcare providers. You do NOT diagnose - you help users prepare for medical consultations.

AI SETTINGS:
- Memory: ${memoryEnabled ? 'Enabled' : 'Disabled'}
- Personalization Level: ${personalizationLevel}
- Subscription Tier: ${subscriptionTier}${memoryContext}${doctorNotesContext}

${patientContext}${healthFormsContext}

CORE INSTRUCTIONS:
- Keep responses SHORT (1-3 sentences) unless asked to expand or clarify
- Help organize symptoms systematically to prepare for doctor visits
- Work through symptoms methodically using available patient data and health forms
- Reference health records and forms data when relevant to current conversation
- Suggest relevant health forms based on conversation context
- Provide possible conditions to discuss with their doctor, with confidence scores
- ALWAYS emphasize these are possibilities to bring up with their doctor, not diagnoses
- Remind users that only doctors can provide actual diagnoses and treatment`;

    // Add personalization based on level
    if (personalizationLevel === 'high') {
      systemPrompt += `
- Use highly personalized responses based on patient history and previous conversations
- Reference specific past symptoms, concerns, and health patterns
- Provide detailed contextual insights`;
    } else if (personalizationLevel === 'medium') {
      systemPrompt += `
- Use moderately personalized responses with some context from patient history
- Reference relevant past information when helpful`;
    } else {
      systemPrompt += `
- Provide general health guidance with minimal personalization
- Focus on current symptoms and immediate preparation needs`;
    }

    systemPrompt += `

RESPONSE FORMAT:
- Give brief, focused answers unless complexity requires detail
- Ask ONE targeted follow-up question at a time
- Suggest specific health forms when relevant to symptoms discussed
- Be empathetic but professional

PREPARATION APPROACH:
1. Organize symptoms against patient's existing data and health records
2. Consider health forms data for patterns and trends
3. Ask clarifying questions to help them describe symptoms better  
4. Consider possible conditions based on symptom patterns to discuss with doctor
5. Assign confidence scores for which possibilities are most worth discussing
6. Always recommend consulting their doctor for proper diagnosis and treatment

Format your suggestions as questions/topics to bring up with their doctor. If you identify potential conditions to discuss, return them in this JSON format within your response:
{
  "diagnoses": [
    {"diagnosis": "condition name to ask doctor about", "confidence": 0.75, "reasoning": "why this is worth discussing with your doctor"}
  ],
  "suggested_forms": ["symptom_tracker", "vital_signs", "medication_log", "mood_tracker", "pain_tracker", "sleep_tracker"]
}

Always end responses with: "These are suggestions to discuss with your doctor, who can provide proper diagnosis and treatment."`;

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
        model: 'grok-3-mini-fast',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from Grok AI',
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Extract and update probable diagnoses if present
    let updatedDiagnoses = null;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"diagnoses"[\s\S]*\}/);
      if (jsonMatch && patient_id) {
        const diagnosisData = JSON.parse(jsonMatch[0]);
        if (diagnosisData.diagnoses) {
          // Merge with existing diagnoses, keeping top 5 by confidence
          const newDiagnoses = diagnosisData.diagnoses.map(d => ({
            ...d,
            updated_at: new Date().toISOString()
          }));
          
          // Combine and deduplicate
          const combined = [...currentDiagnoses];
          newDiagnoses.forEach(newDiag => {
            const existing = combined.findIndex(d => d.diagnosis === newDiag.diagnosis);
            if (existing >= 0) {
              combined[existing] = newDiag; // Update existing
            } else {
              combined.push(newDiag); // Add new
            }
          });
          
          // Sort by confidence and keep top 5
          updatedDiagnoses = combined
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

          // Update patient record
          await supabase
            .from('patients')
            .update({ probable_diagnoses: updatedDiagnoses })
            .eq('id', patient_id)
            .eq('user_id', user_id);
        }
      }
    } catch (error) {
      console.log('No diagnosis data to extract:', error);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        model: 'grok-3-mini-fast',
        usage: data.usage,
        updated_diagnoses: updatedDiagnoses
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grok-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});