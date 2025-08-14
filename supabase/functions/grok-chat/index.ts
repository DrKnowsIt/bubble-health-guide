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
    const user_id = userData.user.id;

    // Get user subscription tier and status
    const { data: subscription } = await supabase
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', user_id)
      .single();

    const subscriptionTier = subscription?.subscription_tier || 'basic';
    const isSubscribed = subscription?.subscribed === true;
    const isPro = isSubscribed && subscriptionTier === 'pro';

    // Enforce: Free/basic users cannot chat with the AI (MVP rule)
    if (!isPro) {
      console.log('grok-chat access denied (requires Pro):', { user_id, subscriptionTier, isSubscribed });
      return new Response(
        JSON.stringify({
          error: 'Chatting with the AI requires a Pro subscription.',
          code: 'subscription_required'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Smart conversation history management
    let dbConversationHistory = [];
    if (memoryEnabled && conversation_id) {
      const { data: messages } = await supabase
        .from('messages')
        .select('type, content, created_at')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })
        .limit(15); // Optimized: fewer messages for better performance

      if (messages) {
        // Keep only relevant context (last 10 messages + any containing diagnoses)
        const recentMessages = messages.slice(-10);
        const diagnosisMessages = messages.filter(msg => 
          msg.content.includes('diagnosis') || msg.content.includes('condition') || msg.content.includes('confidence')
        ).slice(-3);
        
        const uniqueMessages = [...recentMessages];
        diagnosisMessages.forEach(diagMsg => {
          if (!uniqueMessages.find(m => m.created_at === diagMsg.created_at)) {
            uniqueMessages.push(diagMsg);
          }
        });
        
        dbConversationHistory = uniqueMessages
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(msg => ({
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
      
      // Check if we should include conditional data (Pro includes all)
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
- Ask ONE targeted follow-up question at a time to raise confidence in or rule out possibilities
- Iteratively increase confidence in the most likely possibilities; if confidence for a possibility declines below 0.3, gracefully move on to the next
- If multiple possibilities remain low-confidence after reasonable questions, say this might be unusual and recommend consulting their doctor
- Offer safe, evidence-informed holistic methods or lifestyle tips that match the user's data and symptoms when appropriate
- Reference health records and forms when relevant, but DO NOT mention form names like 'symptom_tracker' or 'sleep_tracker' in the visible chat
- Provide possible conditions to discuss with their doctor, with confidence scores, but keep that data out of the visible chat area
- ALWAYS emphasize these are possibilities to bring up with their doctor, not diagnoses
- Remind users that only doctors can provide actual diagnoses and treatment

PERSONALIZATION:
- High: Use specific past symptoms and patterns when helpful
- Medium: Use context when relevant without overfitting
- Low: Keep guidance general and focused on current symptoms

CONFIDENCE SCORING INSTRUCTIONS:
- Base confidence on evidence strength: symptom clarity (0.1-0.3), duration/pattern (0.1-0.2), severity (0.1-0.2), health record correlation (0.1-0.3), medical literature alignment (0.1-0.2)
- Start with baseline confidence, then adjust based on new information
- Increase confidence when: symptoms are specific and well-described, patterns emerge over time, health records support the diagnosis, multiple related symptoms present
- Decrease confidence when: symptoms are vague, contradictory information appears, lack of supporting evidence, better alternative explanations exist
- Remove diagnoses below 0.3 confidence after 2-3 conversation turns
- Maximum confidence should rarely exceed 0.85 without professional assessment

RESPONSE FORMAT:
- Visible chat: brief, empathetic, professional, NO raw JSON, NO form names, NO mention of confidence scores
- CRITICAL: End your visible response with a clear boundary marker: "---DIAGNOSIS_DATA---"
- After the boundary, provide ONLY the JSON object (no other text):
{
  "diagnoses": [
    {"diagnosis": "condition name", "confidence": [calculated_score], "reasoning": "evidence-based justification"}
  ],
  "suggested_forms": ["symptom_tracker", "vital_signs", "medication_log", "mood_tracker", "pain_tracker", "sleep_tracker"]
}

PREPARATION APPROACH:
1. Analyze symptom quality and calculate initial confidence scores
2. Cross-reference with patient's health records and forms data  
3. Ask targeted questions to strengthen or weaken specific possibilities
4. Dynamically adjust confidence based on responses and evidence
5. Prioritize possibilities above 0.5 confidence for follow-up questions
6. Remove low-confidence possibilities gracefully after reasonable investigation

Always end visible responses with: "These are suggestions to discuss with your doctor, who can provide proper diagnosis and treatment."`;

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
        model: 'grok-3-mini',
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

    // Enhanced JSON extraction and response cleaning
    let updatedDiagnoses = null;
    let cleanedResponse = aiResponse;
    
    try {
      // Look for the boundary marker first
      const boundaryIndex = aiResponse.indexOf('---DIAGNOSIS_DATA---');
      
      if (boundaryIndex !== -1) {
        // Split at boundary: everything before is user-facing text
        cleanedResponse = aiResponse.substring(0, boundaryIndex).trim();
        const jsonPart = aiResponse.substring(boundaryIndex + 20).trim(); // Skip boundary marker
        
        try {
          const diagnosisData = JSON.parse(jsonPart);
          if (diagnosisData.diagnoses && patient_id) {
            // Process diagnoses with confidence validation
            const validatedDiagnoses = diagnosisData.diagnoses
              .filter((d: any) => d.confidence >= 0.3) // Filter out low confidence
              .map((d: any) => ({
                ...d,
                confidence: Math.min(Math.max(d.confidence, 0.3), 0.85), // Clamp confidence
                updated_at: new Date().toISOString()
              }));
            
            // Intelligent diagnosis merging
            const combined = [...currentDiagnoses];
            validatedDiagnoses.forEach((newDiag: any) => {
              const existing = combined.findIndex((d: any) => 
                d.diagnosis.toLowerCase() === newDiag.diagnosis.toLowerCase()
              );
              if (existing >= 0) {
                // Update with higher confidence or more recent reasoning
                if (newDiag.confidence > combined[existing].confidence || 
                    newDiag.reasoning.length > combined[existing].reasoning.length) {
                  combined[existing] = newDiag;
                }
              } else {
                combined.push(newDiag);
              }
            });
            
            // Sort by confidence, remove stale low-confidence entries
            const now = new Date();
            updatedDiagnoses = combined
              .filter((d: any) => {
                const age = (now.getTime() - new Date(d.updated_at || now).getTime()) / (1000 * 60 * 60 * 24);
                return d.confidence >= 0.3 || age < 1; // Keep recent entries even if low confidence
              })
              .sort((a: any, b: any) => b.confidence - a.confidence)
              .slice(0, 5);

            // Update patient record
            await supabase
              .from('patients')
              .update({ probable_diagnoses: updatedDiagnoses })
              .eq('id', patient_id);
          }
        } catch (parseError) {
          console.log('Failed to parse diagnosis JSON:', parseError);
        }
      } else {
        // Fallback: try multiple JSON extraction methods
        const extractionMethods = [
          /---\s*\{[\s\S]*?"diagnoses"[\s\S]*?\}\s*$/,  // After triple dash
          /\n\s*\{[\s\S]*?"diagnoses"[\s\S]*?\}\s*$/,   // End of line JSON
          /\{[\s\S]*?"diagnoses"[\s\S]*?\}(?=\s*$)/,    // JSON at very end
        ];
        
        for (const regex of extractionMethods) {
          const match = aiResponse.match(regex);
          if (match) {
            try {
              const jsonStr = match[0].replace(/^[^\{]*/, ''); // Remove any prefix
              const diagnosisData = JSON.parse(jsonStr);
              
              if (diagnosisData.diagnoses && patient_id) {
                cleanedResponse = aiResponse.replace(match[0], '').trim();
                // Process diagnoses (same logic as above)
                const validatedDiagnoses = diagnosisData.diagnoses
                  .filter((d: any) => d.confidence >= 0.3)
                  .map((d: any) => ({
                    ...d,
                    confidence: Math.min(Math.max(d.confidence, 0.3), 0.85),
                    updated_at: new Date().toISOString()
                  }));
                
                const combined = [...currentDiagnoses];
                validatedDiagnoses.forEach((newDiag: any) => {
                  const existing = combined.findIndex((d: any) => 
                    d.diagnosis.toLowerCase() === newDiag.diagnosis.toLowerCase()
                  );
                  if (existing >= 0) {
                    if (newDiag.confidence > combined[existing].confidence) {
                      combined[existing] = newDiag;
                    }
                  } else {
                    combined.push(newDiag);
                  }
                });
                
                updatedDiagnoses = combined
                  .filter((d: any) => d.confidence >= 0.3)
                  .sort((a: any, b: any) => b.confidence - a.confidence)
                  .slice(0, 5);

                await supabase
                  .from('patients')
                  .update({ probable_diagnoses: updatedDiagnoses })
                  .eq('id', patient_id);
                break;
              }
            } catch (e) {
              continue; // Try next method
            }
          }
        }
      }
    } catch (error) {
      console.log('Error in diagnosis extraction:', error);
    }
    
    // Final cleanup: remove any remaining JSON fragments
    cleanedResponse = cleanedResponse
      .replace(/\{[\s\S]*?"diagnoses"[\s\S]*?\}/g, '')
      .replace(/---DIAGNOSIS_DATA---[\s\S]*$/g, '')
      .replace(/^\s*[\{\[][\s\S]*$/gm, '') // Remove lines starting with { or [
      .trim();
    
    // Safety check: ensure we have meaningful content
    if (cleanedResponse.length < 10 && aiResponse.length > 50) {
      console.log('Over-cleaning detected, using fallback');
      // Extract just the first paragraph or sentence
      const sentences = aiResponse.split(/[.!?]+/);
      cleanedResponse = sentences.slice(0, 2).join('. ').trim();
      if (cleanedResponse && !cleanedResponse.endsWith('.')) cleanedResponse += '.';
    }

    return new Response(
      JSON.stringify({ 
        response: cleanedResponse,
        model: 'grok-3-mini',
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
        details: (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
