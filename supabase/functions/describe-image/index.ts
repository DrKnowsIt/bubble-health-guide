import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, conversation_history = [] } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build brief text context from conversation history (last 10 messages)
    const contextText = (conversation_history || [])
      .slice(-10)
      .map((m: any) => `${m.type === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join("\n")
      .slice(0, 1500);

    // Check if this is likely a pet-related conversation based on context
    const isPetContext = contextText.toLowerCase().includes('pet') || 
                        contextText.toLowerCase().includes('dog') || 
                        contextText.toLowerCase().includes('cat') ||
                        contextText.toLowerCase().includes('animal');
    
    const systemPrompt = isPetContext
      ? "You are a veterinary assistant that generates concise, veterinarian-friendly image descriptions for pets. " +
        "Infer key details from the conversation when relevant. " +
        "Return one short sentence (<= 140 chars) covering image type, body part/area, and key visible findings. " +
        "Focus on what veterinarians would need to know. Avoid guesses beyond what is visible."
      : "You are a medical assistant that generates concise, clinician-friendly image descriptions. " +
        "Infer key details from the conversation when relevant. " +
        "Return one short sentence (<= 140 chars) covering modality/type, body part, laterality if present, and key visible findings. " +
        "Avoid PHI, no guesses beyond what is visible.";

    const userTextInstruction =
      `Conversation context (for reference):\n${contextText || 'No prior context provided.'}\n\n` +
      "Describe the attached image in one short, objective sentence for medical recordkeeping.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userTextInstruction },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("describe-image error:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Failed to generate description" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const description = data?.choices?.[0]?.message?.content?.trim() || "Uploaded image";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in describe-image function:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
