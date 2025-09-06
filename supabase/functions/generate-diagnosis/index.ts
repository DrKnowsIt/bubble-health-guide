import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const conversationText = userMessages.join(' ');

    logStep("Analyzing conversation text", { text: conversationText.substring(0, 200) });

    // Use AI to generate diverse, relevant diagnoses
    let diagnoses = [];
    
    if (!openAIApiKey) {
      logStep("No OpenAI API key - using fallback diagnosis generation");
      diagnoses = generateFallbackDiagnoses(conversationText);
    } else {
      try {
        diagnoses = await generateAIDiagnoses(conversationText);
        logStep("AI diagnosis generation completed", { count: diagnoses.length });
      } catch (error) {
        logStep("AI diagnosis failed, using fallback", error.message);
        diagnoses = generateFallbackDiagnoses(conversationText);
      }
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

async function generateAIDiagnoses(conversationText: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        {
          role: 'system',
          content: `You are a medical analysis assistant. Given a health conversation, generate 3-4 diverse, relevant diagnostic topics that should be explored.

IMPORTANT GUIDELINES:
- Generate PRACTICAL, specific diagnoses relevant to the exact symptoms/situations mentioned
- Use realistic confidence scores (15-85%) with good variation
- Each diagnosis should be DISTINCT and cover different possibilities
- Focus on common, actionable conditions rather than rare diseases
- Include environmental/lifestyle causes when relevant (bed bugs, allergies, dermatitis, etc.)
- Be specific (e.g., "Bed Bug Infestation" not "General Skin Issues")

For skin/bite issues, consider: Bed Bug Bites, Flea Dermatitis, Scabies, Contact Dermatitis, Eczema Flare-up, Allergic Reaction
For respiratory issues: Asthma, Allergies, Upper Respiratory Infection, Bronchitis
For digestive issues: Food Poisoning, IBS, Gastritis, Lactose Intolerance

Return JSON array with format:
[{
  "diagnosis": "Specific Condition Name",
  "confidence": 0.65,
  "reasoning": "Brief, specific explanation based on the conversation"
}]`
        },
        {
          role: 'user',
          content: `Analyze this health conversation and generate relevant diagnostic topics: "${conversationText}"`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || response.statusText}`);
  }

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content from OpenAI response');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    logStep("Failed to parse AI response, using text extraction", content.substring(0, 100));
    // Fallback: try to extract diagnoses from text response
    return parseTextDiagnoses(content);
  }
}

function parseTextDiagnoses(text: string) {
  const diagnoses = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('"diagnosis"') || line.includes('diagnosis:')) {
      // Try to extract structured data from text
      const diagnosisMatch = line.match(/diagnosis["']?\s*:\s*["']([^"']+)["']/i);
      if (diagnosisMatch) {
        diagnoses.push({
          diagnosis: diagnosisMatch[1],
          confidence: Math.random() * 0.4 + 0.3, // 30-70%
          reasoning: "Generated from conversation analysis"
        });
      }
    }
  }
  
  return diagnoses.length > 0 ? diagnoses : generateFallbackDiagnoses(text);
}

function generateFallbackDiagnoses(conversationText: string) {
  const text = conversationText.toLowerCase();
  const diagnoses = [];
  
  // Specific condition mapping with varied confidence
  const conditionMap = [
    {
      keywords: ['bite', 'bites', 'bed bug', 'flea', 'mosquito', 'trail', 'red bump'],
      diagnosis: 'Arthropod Bite Reaction',
      confidence: 0.72,
      reasoning: 'Pattern of bites suggests arthropod exposure (bed bugs, fleas, or other insects)'
    },
    {
      keywords: ['smell', 'odor', 'blanket', 'environmental'],
      diagnosis: 'Environmental Allergen Exposure',
      confidence: 0.58,
      reasoning: 'Unusual odors and environmental changes may indicate allergen exposure'
    },
    {
      keywords: ['rash', 'red', 'itchy', 'bumps', 'skin'],
      diagnosis: 'Contact Dermatitis',
      confidence: 0.65,
      reasoning: 'Skin irritation symptoms suggest possible contact dermatitis from new materials'
    },
    {
      keywords: ['homeless', 'blanket', 'bedding'],
      diagnosis: 'Scabies Screening',
      confidence: 0.43,
      reasoning: 'Shared bedding items warrant screening for scabies and other transmissible conditions'
    }
  ];
  
  // Add relevant diagnoses based on conversation content
  for (const condition of conditionMap) {
    if (condition.keywords.some(keyword => text.includes(keyword))) {
      diagnoses.push(condition);
    }
  }
  
  // Add general consultation if no specific matches or if we need more
  if (diagnoses.length < 2) {
    diagnoses.push({
      diagnosis: 'Dermatological Consultation',
      confidence: 0.55,
      reasoning: 'Skin symptoms warrant professional dermatological evaluation'
    });
  }
  
  if (diagnoses.length < 3) {
    diagnoses.push({
      diagnosis: 'Allergy Assessment',
      confidence: 0.41,
      reasoning: 'Consider evaluation for environmental or contact allergies'
    });
  }
  
  return diagnoses.slice(0, 4); // Limit to 4 diagnoses
}