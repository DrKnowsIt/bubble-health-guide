import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    
    // Get the alpha tester code from secrets
    const alphaCode = Deno.env.get("ALPHA_TESTER_CODE");
    
    if (!alphaCode) {
      console.error("ALPHA_TESTER_CODE not configured");
      return new Response(
        JSON.stringify({ valid: false, error: "Alpha testing not available" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate the code (case-insensitive, trimmed)
    const isValid = code?.trim()?.toUpperCase() === alphaCode.trim().toUpperCase();

    return new Response(
      JSON.stringify({ valid: isValid }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error validating alpha code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Validation failed" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
