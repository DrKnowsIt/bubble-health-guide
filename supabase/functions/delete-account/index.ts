import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    console.log('Deleting account for user:', user.id)

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