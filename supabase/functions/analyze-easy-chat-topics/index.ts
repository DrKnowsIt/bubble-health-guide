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
    const { conversation_context, patient_id, conversation_type } = await req.json();

    console.log('Analyzing Easy Chat topics for patient:', patient_id);
    console.log('Conversation type:', conversation_type);
    console.log('Context length:', conversation_context?.length || 0);

    if (!conversation_context) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: conversation_context' }),
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

    // Get patient info, conversation memory, and full conversation history
    let patientContext = 'Patient: Anonymous user';
    let memoryContext = '';
    let conversationHistory = '';
    
    if (patient_id) {
      console.log('Looking up patient with ID:', patient_id);
      
      // Get patient info
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (patient) {
        console.log('Found patient:', patient.first_name, patient.last_name);
        const patientAge = patient.date_of_birth 
          ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
Age: ${patientAge ? `${patientAge} years old` : 'Unknown'}
Gender: ${patient.gender || 'Not specified'}
Species: ${patient.species || 'Human'}`;

        // Get conversation memory for this patient
        const { data: memory } = await supabase
          .from('conversation_memory')
          .select('memory_data')
          .eq('patient_id', patient_id)
          .eq('user_id', userData.user.id)
          .maybeSingle();

        if (memory?.memory_data) {
          console.log('Found conversation memory for patient');
          const memoryData = memory.memory_data;
          
          // Extract relevant memory sections
          const symptoms = memoryData.symptoms ? JSON.stringify(memoryData.symptoms) : '';
          const medicalHistory = memoryData.medical_history ? JSON.stringify(memoryData.medical_history) : '';
          const environmentalFactors = memoryData.environmental_factors ? JSON.stringify(memoryData.environmental_factors) : '';
          const behaviors = memoryData.behaviors ? JSON.stringify(memoryData.behaviors) : '';
          
          memoryContext = `
CONVERSATION MEMORY:
- Symptoms: ${symptoms}
- Medical History: ${medicalHistory}
- Environmental Factors: ${environmentalFactors}
- Behaviors: ${behaviors}`;
        }

        // Get recent conversation messages for context
        const { data: messages } = await supabase
          .from('messages')
          .select('content, role, created_at')
          .eq('patient_id', patient_id)
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (messages && messages.length > 0) {
          console.log(`Found ${messages.length} recent messages`);
          conversationHistory = messages
            .reverse() // Show in chronological order
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
        }
      } else {
        // If patient_id matches user_id, use that
        if (patient_id === userData.user.id) {
          console.log('Using user as patient');
          patientContext = 'Patient: Current user (self-assessment)';
        } else {
          console.log('Patient not found, using generic context');
          patientContext = 'Patient: Anonymous user';
        }
      }
    }

    const systemPrompt = `You are a medical differential diagnosis AI that generates sophisticated health topics based on guided conversation responses.

PATIENT CONTEXT:
${patientContext}

${memoryContext}

${conversationHistory ? `RECENT CONVERSATION HISTORY:\n${conversationHistory}` : ''}

CRITICAL REQUIREMENTS:
- ALWAYS generate EXACTLY 4 health topics - no exceptions
- Think like a medical professional doing differential diagnosis, not just echoing symptoms
- Use sophisticated medical terminology and pathophysiological reasoning
- Each topic should represent a different potential diagnosis or condition
- Consider environmental factors, pest infestations, and infectious diseases

DIFFERENTIAL DIAGNOSIS APPROACH:
- For "knee pain" → consider: "Patellofemoral Pain Syndrome", "Meniscal Tear", "Osteoarthritis", "Iliotibial Band Syndrome"
- For "chest pain" → consider: "Costochondritis", "Gastroesophageal Reflux Disease", "Intercostal Neuralgia", "Anxiety-Related Chest Tightness"
- For "headache" → consider: "Tension-Type Cephalgia", "Cervicogenic Headache", "Temporomandibular Joint Dysfunction", "Medication Overuse Headache"

ENVIRONMENTAL & PEST-RELATED DIFFERENTIAL DIAGNOSIS:
- For "tiny crosses marks under mattress" + "bites on arms" → consider: "Bed Bug Infestation", "Flea Infestation", "Scabies Infestation", "Contact Dermatitis from Mattress Materials"
- For "trail of bites" + "bed issues" → consider: "Bed Bug Bite Pattern", "Flea Bite Dermatitis", "Mite Infestation", "Delayed Hypersensitivity Reaction"
- For "seeing things under bed/mattress" → consider: "Bed Bug Evidence", "Dust Mite Allergen Exposure", "Environmental Contamination", before considering psychiatric causes
- For environmental symptoms → PRIORITIZE infectious/environmental causes over psychiatric explanations

MEDICAL TERMINOLOGY REQUIREMENTS:
- Use precise medical nomenclature with pathophysiological basis
- Include anatomical specificity and clinical descriptors
- Reference underlying mechanisms when possible
- Think about interconnected systems and potential causes
- Consider environmental health factors and pest-related conditions

EXAMPLES OF SOPHISTICATED TOPICS:
❌ BAD: "Knee Pain", "Back Pain", "Stomach Issues", "Delusional Disorder" (for bed bug signs)
✅ GOOD: "Patellofemoral Pain Syndrome with Biomechanical Dysfunction", "Lumbar Facet Joint Syndrome", "Functional Dyspepsia with Gastroparesis", "Bed Bug Infestation with Delayed Hypersensitivity"

REALISTIC CONFIDENCE SCORING GUIDELINES:
Provide VARIED confidence scores based on conversation depth and specificity:

ENVIRONMENTAL HEALTH CONFIDENCE SCORING:
- Classic bed bug indicators ("tiny crosses under mattress", "trail of bites") → HIGH confidence (65-80%)
- Environmental symptoms with physical evidence → MEDIUM-HIGH confidence (55-75%)
- Pest-related symptoms without clear evidence → MEDIUM confidence (35-55%)

VERY LOW CONFIDENCE (10-25%):
- Single word responses or minimal information
- Completely speculative based on limited data
- Example: User says "uncomfortable" → 15% confidence for differential diagnosis

LOW CONFIDENCE (25-45%):
- Vague symptoms without specificity
- Limited conversation depth
- Basic symptom mention without context
- Example: "My knee hurts" → 35% confidence

MEDIUM CONFIDENCE (45-65%):
- Some symptom specificity with basic details
- General location and timing mentioned
- Moderate conversation engagement
- Example: "Sharp knee pain when walking upstairs" → 55% confidence

HIGH CONFIDENCE (65-85%):
- Detailed symptom descriptions with context
- Multiple corroborating factors mentioned
- Clear patterns and triggers identified
- Classic diagnostic indicators present
- Example: "Sharp stabbing pain in right patella, worse with stairs, 3-week duration" → 75% confidence
- Example: "Tiny crosses marks under mattress with arm bites" → 75% confidence for bed bug infestation

CONFIDENCE VARIATION REQUIREMENTS:
- NEVER cluster all scores around 70-75%
- Use the FULL range from 10-85%
- Base scores on actual conversation content depth
- Be more conservative with confidence - medical diagnosis is inherently uncertain
- Give HIGH confidence to classic environmental health indicators

RESPONSE FORMAT (JSON only):
{
  "topics": [
    {
      "topic": "Medically precise topic using proper terminology",
      "confidence": 0.XX,
      "reasoning": "Detailed clinical reasoning referencing specific conversation elements and confidence factors",
      "category": "musculoskeletal|dermatological|gastrointestinal|cardiovascular|respiratory|neurological|genitourinary|endocrine|psychiatric|environmental|infectious|other"
    }
  ]
}

Easy Chat Conversation Context:
${conversation_context}`;

    console.log('Sending request to OpenAI for Easy Chat analysis...');

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
          { role: 'user', content: `Analyze this Easy Chat conversation and generate health topics: ${conversation_context}` }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze Easy Chat conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No response from OpenAI');
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let topicsData;
    try {
      topicsData = JSON.parse(aiResponse);
      console.log('Successfully parsed topics:', topicsData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process topics to ensure exactly 4 are returned
    let processedTopics = (topicsData.topics || [])
      .filter((t: any) => t.topic) // Only filter out topics without content
      .map((t: any) => ({
        topic: t.topic,
        confidence: Math.min(Math.max(t.confidence || 0.1, 0.1), 0.85), // Keep realistic range
        reasoning: t.reasoning || 'Based on conversation responses',
        category: t.category || 'other'
      }))
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

    // Ensure exactly 4 topics - pad with additional differential diagnoses if needed
    if (processedTopics.length < 4) {
      console.log(`Only ${processedTopics.length} topics generated, padding to 4`);
      // Add generic differential diagnoses if we don't have enough
      const genericTopics = [
        { topic: 'Functional Symptom Disorder', confidence: 0.25, reasoning: 'General consideration for unexplained symptoms', category: 'other' },
        { topic: 'Stress-Related Somatic Response', confidence: 0.20, reasoning: 'Psychosomatic contribution to physical symptoms', category: 'psychiatric' },
        { topic: 'Subclinical Inflammatory Process', confidence: 0.15, reasoning: 'Low-grade inflammation as potential contributing factor', category: 'other' },
        { topic: 'Environmental Sensitivity Reaction', confidence: 0.12, reasoning: 'Possible environmental trigger involvement', category: 'other' }
      ];
      
      const needed = 4 - processedTopics.length;
      processedTopics = [...processedTopics, ...genericTopics.slice(0, needed)];
    }

    // Limit to exactly 4 topics
    const finalTopics = processedTopics.slice(0, 4);

    console.log(`Returning exactly ${finalTopics.length} topics`);
    finalTopics.forEach((t, i) => {
      console.log(`Topic ${i + 1}: ${t.topic} (${Math.round(t.confidence * 100)}%)`);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        diagnoses: finalTopics, // Keep this field name for compatibility with the panel
        topics: finalTopics,
        analyzed_context_length: conversation_context.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-easy-chat-topics function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});