import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("regenerate-solution-confidence function loaded");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patient_id, force_regenerate } = await req.json();
    
    if (!patient_id) {
      throw new Error('Missing required parameter: patient_id');
    }

    // Initialize Supabase client with JWT for RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Verify patient ownership
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patient_id)
      .eq('user_id', user.id)
      .single();
      
    if (patientError || !patient) {
      throw new Error('Patient not found or access denied');
    }

    console.log(`Checking solutions for patient ${patient_id}`);

    // Find solutions with high confidence scores (80%+ or exactly 0.9)
    const { data: existingSolutions, error: solutionsError } = await supabase
      .from('conversation_solutions')
      .select('id, conversation_id, confidence, solution, category, created_at')
      .eq('patient_id', patient_id)
      .or('confidence.gte.0.8,confidence.eq.0.9');

    if (solutionsError) {
      throw new Error(`Failed to fetch existing solutions: ${solutionsError.message}`);
    }

    console.log(`Found ${existingSolutions?.length || 0} solutions with high confidence`);

    if (!existingSolutions || existingSolutions.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No high-confidence solutions found to regenerate',
        regenerated_count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by conversation_id for batch regeneration
    const conversationGroups = existingSolutions.reduce((groups: any, solution) => {
      if (!groups[solution.conversation_id]) {
        groups[solution.conversation_id] = [];
      }
      groups[solution.conversation_id].push(solution);
      return groups;
    }, {});

    console.log(`Grouped into ${Object.keys(conversationGroups).length} conversations`);

    let regeneratedCount = 0;
    let skippedCount = 0;

    // Process each conversation group
    for (const [conversationId, solutions] of Object.entries(conversationGroups)) {
      try {
        // Check if we should regenerate (either forced or if more than 60% have 80%+ confidence)
        const solutionArray = solutions as any[];
        const highConfidenceCount = solutionArray.filter(s => s.confidence >= 0.8).length;
        const shouldRegenerate = force_regenerate || (highConfidenceCount / solutionArray.length > 0.6);

        if (!shouldRegenerate) {
          console.log(`Skipping conversation ${conversationId} - confidence distribution seems reasonable`);
          skippedCount += solutionArray.length;
          continue;
        }

        // Get recent messages for this conversation
        const { data: messages } = await supabase
          .from('messages')
          .select('content, type, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!messages || messages.length === 0) {
          console.log(`No messages found for conversation ${conversationId}, skipping`);
          continue;
        }

        // Call the analyze-conversation-solutions function to regenerate
        const { error: regenerateError } = await supabase.functions.invoke('analyze-conversation-solutions', {
          body: {
            conversation_id: conversationId,
            patient_id: patient_id,
            recent_messages: messages.reverse() // Restore chronological order
          }
        });

        if (regenerateError) {
          console.error(`Failed to regenerate solutions for conversation ${conversationId}:`, regenerateError);
        } else {
          regeneratedCount += solutionArray.length;
          console.log(`Successfully regenerated ${solutionArray.length} solutions for conversation ${conversationId}`);
        }

      } catch (error) {
        console.error(`Error processing conversation ${conversationId}:`, error);
      }
    }

    console.log(`Regeneration complete. Regenerated: ${regeneratedCount}, Skipped: ${skippedCount}`);

    return new Response(JSON.stringify({ 
      message: `Successfully processed solutions for patient`,
      regenerated_count: regeneratedCount,
      skipped_count: skippedCount,
      total_processed: regeneratedCount + skippedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-solution-confidence:', error);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});