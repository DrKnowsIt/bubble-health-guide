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
    const { conversation_id, patient_id, recent_messages } = await req.json();

    if (!conversation_id || !patient_id || !recent_messages?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
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

    // Verify patient belongs to user
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ALL existing diagnoses to provide complete context
    const { data: existingDiagnoses } = await supabase
      .from('conversation_diagnoses')
      .select('*')
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id)
      .order('updated_at', { ascending: false });
    
    // Separate high-confidence diagnoses to preserve
    const highConfidenceDiagnoses = existingDiagnoses?.filter(d => d.confidence >= 0.7) || [];
    const allExistingDiagnoses = existingDiagnoses || [];

    // Build conversation context for analysis - focus on the current conversation topic
    const conversationText = recent_messages
      .filter((msg: any) => msg.type === 'user')
      .map((msg: any) => msg.content)
      .join(' ');

    console.log('Analyzing conversation text:', conversationText);

    // Create content hash to detect changes and prevent unnecessary re-analysis
    const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conversationText));
    const contentHashString = Array.from(new Uint8Array(contentHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check if we've already analyzed this exact content recently
    const { data: recentAnalysis } = await supabase
      .from('conversation_diagnoses')
      .select('updated_at')
      .eq('conversation_id', conversation_id)
      .eq('patient_id', patient_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Skip analysis if content hasn't changed and we analyzed recently (within 2 minutes)
    if (recentAnalysis && 
        Date.now() - new Date(recentAnalysis.updated_at).getTime() < 120000 &&
        conversationText.length < 50) {
      return new Response(
        JSON.stringify({ success: true, diagnoses: [], message: 'No significant content changes detected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only proceed if we have meaningful user input
    if (!conversationText.trim() || conversationText.length < 10) {
      return new Response(
        JSON.stringify({ success: true, diagnoses: [], message: 'Insufficient conversation data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get patient context
    const patientAge = patient.date_of_birth 
      ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const isPet = patient.is_pet === true;
    
    const patientContext = `
${isPet ? 'Pet' : 'Patient'}: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
${isPet ? `Species: ${patient.species || 'Not specified'}` : `Gender: ${patient.gender || 'Not specified'}`}

ALL EXISTING DIAGNOSES (must check against these before creating new ones):
${allExistingDiagnoses.length > 0 
  ? allExistingDiagnoses.map(d => `- "${d.diagnosis}" (confidence: ${Math.round(d.confidence * 100)}%, reasoning: ${d.reasoning})`).join('\n')
  : '- None'}

High-confidence diagnoses (≥70% - MUST preserve): ${highConfidenceDiagnoses?.map(d => `"${d.diagnosis}"`).join(', ') || 'None'}`;

    const systemPrompt = isPet 
      ? `You are a veterinary analysis AI that generates comprehensive health topic analysis based on conversation context about pets. PREVENT DUPLICATES using the provided context.

PATIENT CONTEXT:
${patientContext}

CRITICAL DUPLICATE PREVENTION RULES:
- BEFORE creating any diagnosis, check the existing diagnoses list above
- Use STANDARDIZED naming: "Migraine" not "Possible Migraine Headache" or "Migraine Headache"
- If a similar topic exists, use "relates_to_existing" with the EXACT existing name
- Avoid vague qualifiers like "Possible", "Potential", "Suspected" - be direct
- Use medical terminology consistently (e.g., "Headache" not "Head Pain")

NAMING STANDARDS:
- Use concise, medical terms: "Migraine", "Anxiety", "Arthritis"
- Avoid redundant words: "Pain Management" not "Pain Management Issues"
- Be specific but not verbose: "Sleep Disorder" not "Possible Sleep-Related Problems"
- Remove uncertainty language from names but reflect it in confidence scores

DUPLICATE CONSOLIDATION LOGIC:
- If ANY existing diagnosis relates to your new finding, use "relates_to_existing"
- Examples of what should consolidate:
  * "Migraine" + "Headache" → update "Migraine" via relates_to_existing  
  * "Anxiety" + "Stress" → update "Anxiety" via relates_to_existing
  * "Joint Pain" + "Arthritis" → update "Arthritis" via relates_to_existing

RESPONSE FORMAT (JSON only):
{
  "diagnoses": [
    {
      "diagnosis": "standardized_medical_term",
      "confidence": 0.65,
      "reasoning": "evidence-based justification",
      "relates_to_existing": "exact_existing_diagnosis_name_or_null"
    }
  ],
  "preserve_existing": true
}

Current conversation: "${conversationText}"`
      : `You are a medical analysis AI that generates comprehensive health topic analysis based on conversation context. PREVENT DUPLICATES using the provided context.

PATIENT CONTEXT:
${patientContext}

CRITICAL DUPLICATE PREVENTION RULES:
- BEFORE creating any diagnosis, check the existing diagnoses list above
- Use STANDARDIZED naming: "Migraine" not "Possible Migraine Headache" or "Migraine Headache"  
- If a similar topic exists, use "relates_to_existing" with the EXACT existing name
- Avoid vague qualifiers like "Possible", "Potential", "Suspected" - be direct
- Use medical terminology consistently (e.g., "Headache" not "Head Pain")

NAMING STANDARDS:
- Use concise, medical terms: "Migraine", "Anxiety", "Depression", "Hypertension"
- Avoid redundant words: "Pain Management" not "Pain Management Issues"
- Be specific but not verbose: "Sleep Disorder" not "Possible Sleep-Related Problems"
- Remove uncertainty language from names but reflect it in confidence scores

DUPLICATE CONSOLIDATION LOGIC:
- If ANY existing diagnosis relates to your new finding, use "relates_to_existing"
- Examples of what should consolidate:
  * "Migraine" + "Headache" → update "Migraine" via relates_to_existing
  * "Anxiety" + "Stress" → update "Anxiety" via relates_to_existing  
  * "Depression" + "Mood Issues" → update "Depression" via relates_to_existing
  * "Hypertension" + "High Blood Pressure" → update "Hypertension" via relates_to_existing

RESPONSE FORMAT (JSON only):
{
  "diagnoses": [
    {
      "diagnosis": "standardized_medical_term",
      "confidence": 0.65,
      "reasoning": "evidence-based justification",
      "relates_to_existing": "exact_existing_diagnosis_name_or_null"
    }
  ],
  "preserve_existing": true
}

Current conversation: "${conversationText}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this conversation and provide diagnosis suggestions: ${conversationText}` }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let diagnosisData;
    try {
      diagnosisData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and process diagnoses - more inclusive filtering
    const validDiagnoses = (diagnosisData.diagnoses || [])
      .filter((d: any) => d.diagnosis && d.confidence >= 0.4)
      .map((d: any) => ({
        diagnosis: d.diagnosis,
        confidence: Math.min(Math.max(d.confidence, 0.4), 0.9),
        reasoning: d.reasoning || 'No reasoning provided',
        relates_to_existing: d.relates_to_existing || null
      }));

    // Smart diagnosis management: preserve high-confidence, update related, add new
    if (diagnosisData.preserve_existing && highConfidenceDiagnoses.length > 0) {
      // Only delete low-confidence diagnoses, preserve high-confidence ones
      await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id)
        .lt('confidence', 0.7);

      // Process new diagnoses - check for relationships with existing ones
      const finalDiagnoses = [];
      
      for (const newDiag of validDiagnoses) {
        // Enhanced duplicate detection with fuzzy matching for medical terms
        const relatedExisting = allExistingDiagnoses.find(existing => {
          const existingLower = existing.diagnosis.toLowerCase();
          const newLower = newDiag.diagnosis.toLowerCase();
          
          // Direct match check
          if (existingLower === newLower) return true;
          
          // Explicit relates_to_existing field check
          if (newDiag.relates_to_existing === existing.diagnosis) return true;
          
          // Common medical term variations and synonyms
          const medicalSynonyms = [
            ['migraine', 'headache'],
            ['anxiety', 'stress', 'worry'],
            ['depression', 'mood', 'sadness'],
            ['hypertension', 'high blood pressure'],
            ['arthritis', 'joint pain'],
            ['insomnia', 'sleep disorder', 'sleep problem'],
            ['gastritis', 'stomach pain', 'stomach problem'],
            ['dermatitis', 'skin condition', 'rash']
          ];
          
          // Check if terms are in the same synonym group
          for (const synonymGroup of medicalSynonyms) {
            const existingInGroup = synonymGroup.some(term => existingLower.includes(term));
            const newInGroup = synonymGroup.some(term => newLower.includes(term));
            if (existingInGroup && newInGroup) return true;
          }
          
          // Partial match check (one contains the other, at least 4 chars)
          if (existingLower.length >= 4 && newLower.length >= 4) {
            if (existingLower.includes(newLower) || newLower.includes(existingLower)) {
              return true;
            }
          }
          
          return false;
        });
        
        if (relatedExisting) {
          // Consolidate reasoning using AI instead of simple concatenation
          const consolidationPrompt = `Consolidate the following health topic information into a single, concise reasoning. Remove redundancy while preserving key insights:

EXISTING: ${relatedExisting.reasoning}
NEW UPDATE: ${newDiag.reasoning}

Provide a consolidated reasoning that:
- Combines both insights intelligently
- Removes redundant information
- Stays under 200 characters
- Preserves the most important medical details
- Uses clear, professional language

Consolidated reasoning:`;

          const consolidationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4.1-2025-04-14',
              messages: [
                { role: 'user', content: consolidationPrompt }
              ],
              max_completion_tokens: 100
            }),
          });

          let consolidatedReasoning = newDiag.reasoning;
          if (consolidationResponse.ok) {
            const consolidationData = await consolidationResponse.json();
            consolidatedReasoning = consolidationData.choices?.[0]?.message?.content?.trim() || newDiag.reasoning;
          }

          const updatedConfidence = Math.max(relatedExisting.confidence, newDiag.confidence);
          await supabase
            .from('conversation_diagnoses')
            .update({
              confidence: updatedConfidence,
              reasoning: consolidatedReasoning,
              updated_at: new Date().toISOString()
            })
            .eq('id', relatedExisting.id);
        } else {
          // Add as new diagnosis if it doesn't relate to existing ones
          finalDiagnoses.push({
            conversation_id,
            patient_id,
            user_id: userData.user.id,
            diagnosis: newDiag.diagnosis,
            confidence: newDiag.confidence,
            reasoning: newDiag.reasoning
          });
        }
      }

      // Insert truly new diagnoses
      if (finalDiagnoses.length > 0) {
        const { error: insertError } = await supabase
          .from('conversation_diagnoses')
          .insert(finalDiagnoses);

        if (insertError) {
          console.error('Failed to insert new diagnoses:', insertError);
        }
      }
    } else {
      // Fallback: replace all diagnoses (original behavior for simple cases)
      await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('conversation_id', conversation_id)
        .eq('patient_id', patient_id);

      if (validDiagnoses.length > 0) {
        const diagnosesToInsert = validDiagnoses.map((d: any) => ({
          conversation_id,
          patient_id,
          user_id: userData.user.id,
          diagnosis: d.diagnosis,
          confidence: d.confidence,
          reasoning: d.reasoning
        }));

        const { error: insertError } = await supabase
          .from('conversation_diagnoses')
          .insert(diagnosesToInsert);

        if (insertError) {
          console.error('Failed to insert diagnoses:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to save diagnoses' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnoses: validDiagnoses,
        updated_count: validDiagnoses.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-conversation-diagnosis function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});