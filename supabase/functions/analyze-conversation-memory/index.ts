import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[Memory Analysis] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, patient_id, image_feedback } = await req.json();
    
    if (!conversation_id || !patient_id) {
      throw new Error('Missing required parameters: conversation_id and patient_id');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    logStep('Processing memory analysis', { conversation_id, patient_id, user_id: user.id });

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Get recent conversation messages (last 10 for memory context)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('type, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    if (!messages || messages.length === 0) {
      logStep('No messages found for analysis');
      return new Response(JSON.stringify({ success: true, message: 'No messages to analyze' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing memory
    const { data: existingMemory } = await supabase
      .from('conversation_memory')
      .select('memory')
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id)
      .single();

    // Get relevant health record summaries for context
    const { data: healthSummaries } = await supabase
      .from('health_record_summaries')
      .select('summary_text, priority_level')
      .eq('user_id', user.id)
      .in('priority_level', ['always', 'conditional'])
      .order('created_at', { ascending: false })
      .limit(5);

    // Get high-confidence diagnoses for memory context
    const { data: diagnosesToSave } = await supabase
      .from('conversation_diagnoses')
      .select('diagnosis, confidence, reasoning')
      .eq('patient_id', patient_id)
      .gte('confidence', 0.7)
      .order('updated_at', { ascending: false })
      .limit(3);

    // Prepare conversation text for analysis
    const conversationText = messages
      .reverse()
      .map(msg => `${msg.type === 'user' ? 'Patient' : 'AI'}: ${msg.content}`)
      .join('\n');

    // Get patient info to determine if this is a pet
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('is_pet')
      .eq('id', patient_id)
      .single();
    
    if (patientError) {
      logStep('Error fetching patient info', patientError);
    }
    
    const isPet = patient?.is_pet === true;

    logStep('Analyzing conversation for memory extraction', { 
      messageCount: messages.length,
      hasExistingMemory: !!existingMemory,
      isPet 
    });

    // Define memory rules directly (since edge functions can't read external files)
    const petMemoryRules = [
      "Save when owner confirms a veterinarian-diagnosed condition or prior medical history",
      "Save important symptoms the owner mentions—even if they're not the primary concern initially",
      "Save notable environmental factors, diet details, routine changes, or behavioral patterns that may be medically relevant",
      "Save any medications, supplements, treatments, and recent changes the pet is receiving",
      "Save key negatives when relevant (e.g., 'no vomiting', 'eating normally', 'no lethargy') to avoid repeated questioning",
      "Overwrite outdated memories with newer information",
      "Always timestamp symptoms and medical events",
      "Save stated care preferences (e.g., prefers natural approaches first, budget constraints, treatment anxiety)",
      "Save environmental exposures if potentially relevant (e.g., new foods, plants, chemicals, other animals)",
      "Save species, breed, age, weight, and any breed-specific health considerations mentioned"
    ];

    const humanMemoryRules = [
      "Save when user confirms a doctor-diagnosed illness or prior medical history",
      "Save important symptoms the user mentions—even if they're not focused on them initially", 
      "Save noticeable unhealthy habits that may be medically relevant (e.g., sleep deprivation, heavy workload, substance use)",
      "Save any medications, supplements, and recent changes the user is actively taking",
      "Save key negatives when relevant (e.g., 'no chest pain', 'no fever') to avoid repeated questioning",
      "Overwrite outdated memories with newer information",
      "Always timestamp symptoms and medical events",
      "Save stated care preferences (e.g., prefers natural approaches first, anxiety about tests)",
      "Save environmental exposures if potentially relevant (e.g., water/air/occupational notes)"
    ];

    const memoryRules = isPet ? petMemoryRules : humanMemoryRules;
      
    const entityType = isPet ? 'pet patient' : 'patient';
    const systemPrompt = `You are a medical conversation memory analyzer. Your job is to extract and update ${entityType} memory following these specific rules:

MEMORY RULES:
${memoryRules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}

CURRENT MEMORY: ${JSON.stringify(existingMemory?.memory || {}, null, 2)}

HEALTH RECORD CONTEXT: 
${healthSummaries?.map(h => `- ${h.summary_text} (Priority: ${h.priority_level})`).join('\n') || 'No health records available'}

HIGH-CONFIDENCE DIAGNOSES TO REMEMBER:
${diagnosesToSave?.map(d => `- ${d.diagnosis} (${Math.round(d.confidence * 100)}%): ${d.reasoning}`).join('\n') || 'None'}

CONVERSATION TO ANALYZE:
${conversationText}

Extract memory updates as a JSON object. Include health record insights and high-confidence diagnoses. Only include NEW or UPDATED information that follows the memory rules. Use this structure:
{
  "medical_history": ["confirmed diagnoses or conditions"],
  "current_medications": ["medications, supplements with recent changes noted"],
  "symptoms": {
    "symptom_name": {
      "description": "details",
      "onset": "timestamp or timeframe",
      "severity": "mild/moderate/severe if mentioned"
    }
  },
  "lifestyle_factors": {
    "sleep": "patterns or issues",
    "work": "relevant work habits",
    "substances": "alcohol, smoking, etc."
  },
  "key_negatives": ["things patient explicitly doesn't have"],
  "care_preferences": ["patient's stated preferences"],
  "environmental_factors": ["relevant exposures"],
  "high_confidence_topics": ["topics with strong evidence from conversation"],
  "health_record_insights": ["relevant insights from health records"],
  "last_updated": "${new Date().toISOString()}"
}

Only return the JSON object. If no new memory-worthy information is found, return an empty object: {}`;

    // Call OpenAI for memory analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analyze this conversation and extract memory updates according to the rules.' }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logStep('OpenAI API error', { status: openaiResponse.status, error: errorText });
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const memoryContent = openaiResult.choices[0].message.content.trim();

    logStep('OpenAI memory analysis response', { content: memoryContent });

    // Parse memory updates
    let memoryUpdates = {};
    try {
      memoryUpdates = JSON.parse(memoryContent);
    } catch (parseError) {
      logStep('Failed to parse memory JSON, trying to extract', { error: parseError.message });
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = memoryContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        memoryUpdates = JSON.parse(jsonMatch[0]);
      } else {
        logStep('No valid JSON found in response');
        memoryUpdates = {};
      }
    }

    // Handle image feedback if provided
    if (image_feedback) {
      logStep('Processing image feedback', image_feedback);
      
      const feedbackKey = `visual_confirmation_${image_feedback.searchTerm}`;
      memoryUpdates[feedbackKey] = {
        matches: image_feedback.matches,
        imageId: image_feedback.imageId,
        timestamp: image_feedback.timestamp,
        confidence: image_feedback.matches ? 'high' : 'low'
      };
    }

    // Only update if we have new memory information
    if (Object.keys(memoryUpdates).length > 0) {
      // Merge with existing memory
      const updatedMemory = {
        ...existingMemory?.memory || {},
        ...memoryUpdates
      };

      // Upsert conversation memory - handle existing records properly
      const { data: existingRecord } = await supabase
        .from('conversation_memory')
        .select('id')
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id)
        .single();

      let memoryError;
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('conversation_memory')
          .update({
            memory: updatedMemory,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversation_id)
          .eq('patient_id', patient_id);
        memoryError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('conversation_memory')
          .insert({
            conversation_id,
            patient_id,
            user_id: user.id,
            memory: updatedMemory,
            updated_at: new Date().toISOString(),
          });
        memoryError = error;
      }

      if (memoryError) {
        logStep('Failed to save memory', { error: memoryError });
        throw new Error(`Failed to save memory: ${memoryError.message}`);
      }

      logStep('Memory successfully updated', { updatedFields: Object.keys(memoryUpdates) });
    } else {
      logStep('No new memory information to save');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      memoryUpdated: Object.keys(memoryUpdates).length > 0,
      updatedFields: Object.keys(memoryUpdates)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Error in memory analysis', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});