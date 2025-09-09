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
    const { user_id, from_tier, to_tier } = await req.json();

    if (!user_id || !from_tier || !to_tier) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SUBSCRIPTION-CLEANUP] Processing downgrade from ${from_tier} to ${to_tier} for user ${user_id}`);

    // Initialize Supabase client with service role key for cleanup operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Define allowed record types for each tier
    const basicHumanForms = [
      'general_health_notes',
      'personal_demographics', 
      'medical_history', 
      'vital_signs_current', 
      'patient_observations'
    ];

    const basicPetForms = [
      'pet_general_notes',
      'pet_basic_info',
      'pet_current_health',
      'pet_health_observations',
      'pet_veterinary_history',
      'pet_behavior_lifestyle',
      'pet_diet_nutrition',
      'pet_emergency_contacts'
    ];

    // Only perform cleanup if downgrading from pro to basic
    if (from_tier === 'pro' && to_tier === 'basic') {
      // Get all patients for this user
      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_pet')
        .eq('user_id', user_id);

      if (patients) {
        for (const patient of patients) {
          const allowedTypes = patient.is_pet ? basicPetForms : basicHumanForms;
          
          // Archive Pro-only health records (don't delete, just mark as archived)
          const { data: proOnlyRecords } = await supabase
            .from('health_records')
            .select('id, record_type, title')
            .eq('user_id', user_id)
            .eq('patient_id', patient.id)
            .not('record_type', 'in', `(${allowedTypes.map(t => `"${t}"`).join(',')})`);

          if (proOnlyRecords && proOnlyRecords.length > 0) {
            // Add metadata to mark as archived due to downgrade
            const updates = proOnlyRecords.map(record => ({
              id: record.id,
              metadata: {
                ...((record as any).metadata || {}),
                archived_due_to_downgrade: true,
                archived_at: new Date().toISOString(),
                original_tier: 'pro'
              }
            }));

            // Update records to mark them as archived
            for (const update of updates) {
              await supabase
                .from('health_records')
                .update({ metadata: update.metadata })
                .eq('id', update.id);
            }

            console.log(`[SUBSCRIPTION-CLEANUP] Archived ${proOnlyRecords.length} Pro-only records for patient ${patient.id}`);
          }
        }
      }

      // Also clean up any Pro-specific analysis data (final medical analysis, comprehensive reports)
      await supabase
        .from('final_medical_analysis')
        .delete()
        .eq('user_id', user_id);

      await supabase
        .from('comprehensive_health_reports')
        .delete()
        .eq('user_id', user_id);

      console.log(`[SUBSCRIPTION-CLEANUP] Cleaned up Pro-specific analysis data for user ${user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Subscription cleanup completed for downgrade from ${from_tier} to ${to_tier}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SUBSCRIPTION-CLEANUP] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});