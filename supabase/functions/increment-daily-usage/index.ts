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
    // Create service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { p_user_id, p_date, p_messages, p_tokens, p_cost } = await req.json();
    
    console.log('Incrementing daily usage:', { p_user_id, p_date, p_messages, p_tokens, p_cost });

    // Try to get existing record
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('daily_usage_limits')
      .select('*')
      .eq('user_id', p_user_id)
      .eq('date', p_date)
      .maybeSingle();

    if (selectError) {
      console.error('Error selecting existing usage:', selectError);
      throw selectError;
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('daily_usage_limits')
        .update({
          messages_used: existing.messages_used + p_messages,
          tokens_used: existing.tokens_used + p_tokens,
          cost_incurred: existing.cost_incurred + p_cost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', p_user_id)
        .eq('date', p_date);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        throw updateError;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('daily_usage_limits')
        .insert({
          user_id: p_user_id,
          date: p_date,
          messages_used: p_messages,
          tokens_used: p_tokens,
          cost_incurred: p_cost
        });

      if (insertError) {
        console.error('Error inserting usage:', insertError);
        throw insertError;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in increment-daily-usage function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});