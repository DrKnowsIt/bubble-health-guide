import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[Clear Form Memory] ${step}`, data || '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create authenticated Supabase client using the JWT
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logStep('Authentication failed', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { health_record_id, patient_id, form_type } = await req.json();
    
    logStep('Starting memory cleanup', { health_record_id, patient_id, form_type, user_id: user.id });

    // Clean up conversation memory references to this form data
    if (patient_id) {
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id)
        .like('memory::text', `%${form_type}%`);

      if (memoryError) {
        logStep('Error cleaning conversation memory', memoryError);
      } else {
        logStep('Cleaned conversation memory for form type', form_type);
      }
    }

    // Clean up comprehensive health reports that may contain analyzed form data
    if (patient_id || health_record_id) {
      const { error: reportsError } = await supabase
        .from('comprehensive_health_reports')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id || null);

      if (reportsError) {
        logStep('Error cleaning comprehensive health reports', reportsError);
      } else {
        logStep('Cleaned comprehensive health reports for patient', patient_id);
      }
    }

    // Clean up doctor notes that reference this health record
    if (health_record_id) {
      const { error: notesError } = await supabase
        .from('doctor_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id || null)
        .like('content', `%${health_record_id}%`);

      if (notesError) {
        logStep('Error cleaning doctor notes', notesError);
      } else {
        logStep('Cleaned doctor notes for health record', health_record_id);
      }
    }

    // Clean up health insights related to this health record
    if (health_record_id) {
      const { error: insightsError } = await supabase
        .from('health_insights')
        .delete()
        .eq('user_id', user.id)
        .eq('health_record_id', health_record_id);

      if (insightsError) {
        logStep('Error cleaning health insights', insightsError);
      } else {
        logStep('Cleaned health insights for health record', health_record_id);
      }
    }

    // Clean up health record summaries
    if (health_record_id) {
      const { error: summariesError } = await supabase
        .from('health_record_summaries')
        .delete()
        .eq('user_id', user.id)
        .eq('health_record_id', health_record_id);

      if (summariesError) {
        logStep('Error cleaning health record summaries', summariesError);
      } else {
        logStep('Cleaned health record summaries for health record', health_record_id);
      }
    }

    // Clean up health record history (previous versions of the data)
    if (health_record_id) {
      const { error: historyError } = await supabase
        .from('health_record_history')
        .delete()
        .eq('user_id', user.id)
        .eq('health_record_id', health_record_id);

      if (historyError) {
        logStep('Error cleaning health record history', historyError);
      } else {
        logStep('Cleaned health record history for health record', health_record_id);
      }
    }

    // Clean up any conversation messages that might reference the form data
    if (health_record_id && patient_id) {
      // Get conversations for this patient first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Delete messages that reference the health record or form type
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds)
          .or(`content.like.%${health_record_id}%,content.like.%${form_type}%`);

        if (messagesError) {
          logStep('Error cleaning messages', messagesError);
        } else {
          logStep('Cleaned messages referencing form data');
        }
      }
    }

    logStep('Memory cleanup completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Form memory cleaned successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Error in clear-form-memory function', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});