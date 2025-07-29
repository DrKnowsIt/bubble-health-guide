import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-DIAGNOSIS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { conversation_id, patient_id, messages } = body;

    if (!conversation_id || !patient_id || !messages || !Array.isArray(messages)) {
      throw new Error("Missing required fields: conversation_id, patient_id, messages");
    }

    logStep("Processing conversation", { conversationId: conversation_id, patientId: patient_id, messageCount: messages.length });

    // Extract user messages for analysis
    const userMessages = messages.filter((msg: any) => msg.type === 'user').map((msg: any) => msg.content);
    const conversationText = userMessages.join(' ').toLowerCase();

    // Generate diagnoses based on conversation content
    const diagnoses = [];

    // Check for various health topics and symptoms
    const healthKeywords = {
      headache: {
        confidence: 0.8,
        reasoning: "Patient reported headache symptoms that should be evaluated by a healthcare professional for proper diagnosis and treatment."
      },
      fever: {
        confidence: 0.75,
        reasoning: "Fever symptoms mentioned require medical assessment to determine underlying cause and appropriate treatment."
      },
      'chest pain': {
        confidence: 0.9,
        reasoning: "Chest pain symptoms mentioned - important to rule out serious conditions and get urgent medical evaluation."
      },
      'stomach pain': {
        confidence: 0.7,
        reasoning: "Abdominal pain symptoms should be assessed by a healthcare provider to determine cause and treatment."
      },
      cough: {
        confidence: 0.65,
        reasoning: "Persistent cough mentioned - important to evaluate for respiratory conditions or infections."
      },
      fatigue: {
        confidence: 0.6,
        reasoning: "Fatigue symptoms reported - could indicate various conditions that should be discussed with a doctor."
      },
      dizziness: {
        confidence: 0.7,
        reasoning: "Dizziness symptoms can have multiple causes and should be evaluated by a healthcare professional."
      },
      nausea: {
        confidence: 0.65,
        reasoning: "Nausea symptoms mentioned - important to determine underlying cause through medical evaluation."
      }
    };

    // Analyze conversation for health keywords
    for (const [keyword, info] of Object.entries(healthKeywords)) {
      if (conversationText.includes(keyword)) {
        diagnoses.push({
          diagnosis: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Assessment`,
          confidence: info.confidence,
          reasoning: info.reasoning
        });
      }
    }

    // Always add a general assessment if user has asked health-related questions
    if (userMessages.length > 0) {
      diagnoses.push({
        diagnosis: "General Health Consultation",
        confidence: 0.7,
        reasoning: "Based on the health discussion, these topics should be reviewed with your healthcare provider during your next visit."
      });
    }

    // Remove existing diagnoses for this conversation
    await supabaseClient
      .from('conversation_diagnoses')
      .delete()
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id);

    // Insert new diagnoses
    if (diagnoses.length > 0) {
      const diagnosisRecords = diagnoses.map(diagnosis => ({
        conversation_id,
        patient_id,
        user_id: user.id,
        diagnosis: diagnosis.diagnosis,
        confidence: diagnosis.confidence,
        reasoning: diagnosis.reasoning
      }));

      const { error: insertError } = await supabaseClient
        .from('conversation_diagnoses')
        .insert(diagnosisRecords);

      if (insertError) {
        logStep("Error inserting diagnoses", insertError);
        throw insertError;
      }

      logStep("Diagnoses generated and saved", { count: diagnoses.length });
    }

    return new Response(JSON.stringify({
      success: true,
      diagnoses,
      message: `Generated ${diagnoses.length} diagnosis topics for conversation`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-diagnosis", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});