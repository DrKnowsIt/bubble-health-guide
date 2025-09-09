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
    // Initialize Supabase client with JWT (RLS enforced)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    // Verify user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user_id = userData.user.id;

    console.log(`[CONVERSATION-MIGRATION] Starting migration for user ${user_id}`);

    // Find all conversations without episodes for this user
    const { data: orphanedConversations } = await supabase
      .from('conversations')
      .select('id, patient_id, title, created_at')
      .eq('user_id', user_id)
      .is('health_episode_id', null);

    if (!orphanedConversations || orphanedConversations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orphaned conversations found',
          migrated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CONVERSATION-MIGRATION] Found ${orphanedConversations.length} orphaned conversations`);

    let migratedCount = 0;

    // Group conversations by patient for better episode creation
    const conversationsByPatient = orphanedConversations.reduce((acc, conv) => {
      const patientId = conv.patient_id || 'no-patient';
      if (!acc[patientId]) acc[patientId] = [];
      acc[patientId].push(conv);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [patientId, conversations] of Object.entries(conversationsByPatient)) {
      // Create a general episode for each patient's orphaned conversations
      const episodeTitle = patientId === 'no-patient' 
        ? 'Previous General Discussion' 
        : 'Previous Health Discussion';
      
      const { data: newEpisode } = await supabase
        .from('health_episodes')
        .insert({
          user_id: user_id,
          patient_id: patientId === 'no-patient' ? null : patientId,
          episode_title: episodeTitle,
          episode_description: `Auto-created episode for ${conversations.length} existing conversation${conversations.length > 1 ? 's' : ''}`,
          episode_type: 'symptoms',
          start_date: new Date(Math.min(...conversations.map(c => new Date(c.created_at).getTime()))).toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (newEpisode) {
        // Link all conversations to the new episode
        const conversationIds = conversations.map(c => c.id);
        
        await supabase
          .from('conversations')
          .update({ health_episode_id: newEpisode.id })
          .in('id', conversationIds);
        
        migratedCount += conversations.length;
        console.log(`[CONVERSATION-MIGRATION] Linked ${conversations.length} conversations to episode ${newEpisode.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully migrated ${migratedCount} conversations to episodes`,
        migrated: migratedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CONVERSATION-MIGRATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});