import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, patient_id } = await req.json();

    if (!conversation_id || !patient_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.45.4"
    );

    // Use anon client with the caller's JWT to enforce RLS
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Verify authenticated user
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authUserId = userData.user.id;
    // Verify conversation ownership via RLS
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, patient_id")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "Conversation not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest 50 messages for context (RLS enforced)
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("type, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (msgErr) throw msgErr;

    // Fetch existing memory (or create if missing) for this conversation and user
    const { data: memRows } = await supabase
      .from("conversation_memory")
      .select("id, memory")
      .eq("conversation_id", conversation_id)
      .maybeSingle();

    let memory: Record<string, unknown> = memRows?.memory || {};

    const messagesForModel = [
      {
        role: "system",
        content:
          "You are a medical analysis assistant. You never produce visible chat replies. Analyze conversation turns to infer probable diagnoses (with confidence 0-1 and short reasoning) and suggest any forms to collect structured info. Maintain a JSON memory object that stores important facts for this conversation (e.g., symptoms, timelines, severities, medications). Only output strict JSON with keys: diagnoses (array of {diagnosis, confidence, reasoning}), suggested_forms (array of strings), memory_update (object to merge into existing memory).",
      },
      {
        role: "user",
        content: JSON.stringify({
          memory,
          transcript: msgs?.map((m) => ({ role: m.type, content: m.content })) || [],
        }),
      },
    ];

    // Call OpenAI (or compatible) for analysis
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesForModel,
        temperature: 0.2,
      }),
    });

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";

    let parsed: {
      diagnoses?: Array<{ diagnosis: string; confidence?: number; reasoning?: string }>;
      suggested_forms?: string[];
      memory_update?: Record<string, unknown>;
    } = {};

    try {
      parsed = JSON.parse(content);
    } catch (_) {
      parsed = {};
    }

    // Upsert memory (RLS ensures only owner can write)
    const newMemory = { ...(memory || {}), ...(parsed.memory_update || {}) };

    if (memRows?.id) {
      await supabase
        .from("conversation_memory")
        .update({ memory: newMemory })
        .eq("id", memRows.id);
    } else {
      await supabase.from("conversation_memory").insert({
        conversation_id,
        patient_id,
        user_id: authUserId,
        memory: newMemory,
      });
    }

    // Replace diagnoses for this conversation/patient (RLS enforced)
    if (Array.isArray(parsed.diagnoses)) {
      await supabase
        .from("conversation_diagnoses")
        .delete()
        .eq("conversation_id", conversation_id)
        .eq("patient_id", patient_id);

      const rows = parsed.diagnoses
        .filter((d) => d && d.diagnosis)
        .map((d) => ({
          conversation_id,
          patient_id,
          user_id: authUserId,
          diagnosis: d.diagnosis,
          confidence: typeof d.confidence === "number" ? d.confidence : null,
          reasoning: d.reasoning || null,
        }));

      if (rows.length > 0) {
        await supabase.from("conversation_diagnoses").insert(rows);
      }
    }

    return new Response(
      JSON.stringify({
        updated: true,
        diagnoses_count: parsed.diagnoses?.length || 0,
        suggested_forms: parsed.suggested_forms || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-conversation error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});