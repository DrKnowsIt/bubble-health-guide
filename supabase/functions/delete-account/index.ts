import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from "https://esm.sh/stripe@14.21.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create a regular client to get the user from the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    
    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Preparing to cancel Stripe subscriptions and delete account for user:', user.id)

    // Attempt to cancel any active Stripe subscriptions before deleting data
    try {
      const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
      if (stripeSecret) {
        const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' } as any);
        console.log('Looking up Stripe customer for:', user.email);

        // Find customer by email
        let customerId: string | null = null;
        if (user.email) {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            console.log('Found Stripe customer:', customerId);
          } else {
            console.log('No Stripe customer found for user.');
          }
        }

        if (customerId) {
          // List all subscriptions and cancel non-canceled ones
          const subs = await stripe.subscriptions.list({ customer: customerId, limit: 100 });
          if (subs.data.length > 0) {
            console.log(`Found ${subs.data.length} Stripe subscription(s). Cancelling...`);
          }
          for (const s of subs.data) {
            if (s.status !== 'canceled') {
              try {
                await stripe.subscriptions.cancel(s.id);
                console.log('Canceled subscription:', s.id);
              } catch (cancelErr) {
                console.error('Failed to cancel subscription:', s.id, cancelErr);
              }
            }
          }

          // Best-effort: update subscribers record if table exists
          try {
            await supabaseAdmin
              .from('subscribers')
              .upsert({
                email: user.email,
                user_id: user.id,
                stripe_customer_id: customerId,
                subscribed: false,
                subscription_tier: null,
                subscription_end: null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'email' });
          } catch (dbErr) {
            console.warn('Could not update subscribers table (may not exist):', dbErr);
          }
        }
      } else {
        console.warn('STRIPE_SECRET_KEY not configured; skipping subscription cancellation.');
      }
    } catch (stripeErr) {
      console.error('Error attempting to cancel Stripe subscriptions:', stripeErr);
      // Continue with account deletion even if cancellation fails
    }

    // Delete user data from our custom tables first
    // Delete health records
    await supabaseAdmin
      .from('health_records')
      .delete()
      .eq('user_id', user.id)

    // Delete diagnosis feedback
    await supabaseAdmin
      .from('diagnosis_feedback')
      .delete()
      .eq('user_id', user.id)

    // Delete messages (via conversations foreign key will handle this)
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)

    if (conversations) {
      for (const conv of conversations) {
        await supabaseAdmin
          .from('messages')
          .delete()
          .eq('conversation_id', conv.id)
      }
    }

    // Delete conversations
    await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('user_id', user.id)

    // Delete patients
    await supabaseAdmin
      .from('patients')
      .delete()
      .eq('user_id', user.id)

    // Delete AI settings
    await supabaseAdmin
      .from('ai_settings')
      .delete()
      .eq('user_id', user.id)

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', user.id)

    // Finally, delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Account successfully deleted for user:', user.id)

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-account function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})