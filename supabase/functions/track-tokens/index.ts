import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOKEN_LIMIT = 4000;
const TIMEOUT_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, tokens_to_add } = await req.json();
    
    console.log(`Tracking ${tokens_to_add} tokens for user ${user_id}`);

    // Get current user token status
    const { data: currentStatus, error: fetchError } = await supabaseClient
      .from('user_token_limits')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching user token status:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user token status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newTokenCount = currentStatus.current_tokens + tokens_to_add;
    const now = new Date();
    let timeoutTriggered = false;

    // Check if adding tokens would exceed the limit
    if (newTokenCount >= TOKEN_LIMIT && currentStatus.can_chat) {
      // Trigger timeout
      timeoutTriggered = true;
      
      const { error: updateError } = await supabaseClient
        .from('user_token_limits')
        .update({
          current_tokens: newTokenCount,
          can_chat: false,
          limit_reached_at: now.toISOString()
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Error updating user tokens with timeout:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Timeout triggered for user ${user_id}. Token count: ${newTokenCount}`);
    } else {
      // Just add tokens without triggering timeout
      const { error: updateError } = await supabaseClient
        .from('user_token_limits')
        .update({
          current_tokens: newTokenCount
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Error updating user tokens:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Added ${tokens_to_add} tokens for user ${user_id}. New total: ${newTokenCount}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeout_triggered: timeoutTriggered,
        current_tokens: newTokenCount,
        can_chat: !timeoutTriggered && currentStatus.can_chat
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-tokens function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});