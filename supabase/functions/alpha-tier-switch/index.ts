import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ALPHA-TIER-SWITCH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is alpha tester
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('alpha_tester')
      .eq('email', user.email)
      .single();

    if (profileError || !profileData?.alpha_tester) {
      throw new Error("User is not an alpha tester");
    }
    logStep("Alpha tester verified");

    const { email, subscribed, subscription_tier, subscription_end } = await req.json();
    
    if (email !== user.email) {
      throw new Error("Email mismatch");
    }

    // Normalize subscription tier to lowercase
    const normalizedTier = subscription_tier ? subscription_tier.toLowerCase() : null;

    logStep("Updating subscription", { subscribed, subscription_tier: normalizedTier, subscription_end });

    // Update subscribers table
    const { error: updateError } = await supabaseClient
      .from('subscribers')
      .upsert({
        email: user.email,
        user_id: user.id,
        subscribed,
        subscription_tier: normalizedTier,
        subscription_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    logStep("Subscription updated successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in alpha-tier-switch", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});