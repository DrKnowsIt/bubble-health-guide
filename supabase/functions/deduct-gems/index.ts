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

    const { user_id, gems_to_deduct } = await req.json();
    
    console.log(`Deducting ${gems_to_deduct} gems for user ${user_id}`);

    // Get current gem status
    const { data: currentGems, error: fetchError } = await supabaseClient
      .from('user_gems')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching current gems:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch gem status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if gems need to be reset
    const now = new Date();
    const nextReset = new Date(currentGems.next_reset_at);
    
    if (now >= nextReset) {
      // Reset gems first
      const { error: resetError } = await supabaseClient
        .from('user_gems')
        .update({
          current_gems: currentGems.max_gems,
          last_reset_at: now.toISOString(),
          next_reset_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', user_id);

      if (resetError) {
        console.error('Error resetting gems:', resetError);
      } else {
        currentGems.current_gems = currentGems.max_gems;
      }
    }

    // Check if user has enough gems
    if (currentGems.current_gems < gems_to_deduct) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          remaining_gems: currentGems.current_gems,
          error: 'Insufficient gems' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct gems
    const newGemCount = currentGems.current_gems - gems_to_deduct;
    const { error: updateError } = await supabaseClient
      .from('user_gems')
      .update({ current_gems: newGemCount })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating gems:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to deduct gems' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deducted ${gems_to_deduct} gems. Remaining: ${newGemCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remaining_gems: newGemCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deduct-gems function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});