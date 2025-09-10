import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();
    
    console.log(`Resetting gems for user ${user_id}`);

    const now = new Date();
    const nextReset = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    // Get user's max gems
    const { data: userGems, error: fetchError } = await supabaseClient
      .from('user_gems')
      .select('max_gems')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching user gems:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user gems' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset gems to max
    const { error: updateError } = await supabaseClient
      .from('user_gems')
      .update({
        current_gems: userGems.max_gems,
        last_reset_at: now.toISOString(),
        next_reset_at: nextReset.toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error resetting gems:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset gems' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully reset gems for user ${user_id} to ${userGems.max_gems}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        current_gems: userGems.max_gems,
        next_reset_at: nextReset.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-gems function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});