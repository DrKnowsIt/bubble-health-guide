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

    // Clean up ALL conversation memory for this patient (not just form-specific)
    if (patient_id) {
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (memoryError) {
        logStep('Error cleaning conversation memory', memoryError);
      } else {
        logStep('Cleaned ALL conversation memory for patient', patient_id);
      }
    }

    // Delete ALL health records of the same type for this patient, not just the current one
    if (form_type && patient_id) {
      const { error: healthRecordsError } = await supabase
        .from('health_records')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id)
        .eq('record_type', form_type);

      if (healthRecordsError) {
        logStep('Error deleting health records', healthRecordsError);
      } else {
        logStep('Deleted ALL health records of type', form_type);
      }
    }

    // Clean up ALL comprehensive health reports for this patient (they contain analyzed form data)
    if (patient_id) {
      const { error: reportsError } = await supabase
        .from('comprehensive_health_reports')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (reportsError) {
        logStep('Error cleaning comprehensive health reports', reportsError);
      } else {
        logStep('Cleaned ALL comprehensive health reports for patient', patient_id);
      }
    }

    // Clean up ALL doctor notes for this patient
    if (patient_id) {
      const { error: notesError } = await supabase
        .from('doctor_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (notesError) {
        logStep('Error cleaning doctor notes', notesError);
      } else {
        logStep('Cleaned ALL doctor notes for patient', patient_id);
      }
    }

    // Clean up ALL health insights for this patient
    if (patient_id) {
      const { error: insightsError } = await supabase
        .from('health_insights')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (insightsError) {
        logStep('Error cleaning health insights', insightsError);
      } else {
        logStep('Cleaned ALL health insights for patient', patient_id);
      }
    }

    // Clean up ALL health record summaries for this patient
    if (patient_id) {
      const { error: summariesError } = await supabase
        .from('health_record_summaries')
        .delete()
        .eq('user_id', user.id);

      if (summariesError) {
        logStep('Error cleaning health record summaries', summariesError);
      } else {
        logStep('Cleaned ALL health record summaries for user');
      }
    }

    // Clean up ALL health record history for this patient
    if (patient_id) {
      const { error: historyError } = await supabase
        .from('health_record_history')
        .delete()
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (historyError) {
        logStep('Error cleaning health record history', historyError);
      } else {
        logStep('Cleaned ALL health record history for patient', patient_id);
      }
    }

    // Clean up ALL conversation messages for this patient
    if (patient_id) {
      // Get conversations for this patient first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('patient_id', patient_id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        // Delete ALL messages for this patient
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) {
          logStep('Error cleaning messages', messagesError);
        } else {
          logStep('Cleaned ALL messages for patient conversations');
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
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});