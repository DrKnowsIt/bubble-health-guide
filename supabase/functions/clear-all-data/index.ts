import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, data?: any) => {
  console.log(`[Clear All Data] ${step}`, data ? JSON.stringify(data, null, 2) : '')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Starting comprehensive data cleanup')

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      logStep('Authentication failed', { error: authError })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id
    logStep('Authenticated user', { userId })

    // Create admin client for cascading deletes
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Delete data in proper order to respect foreign key constraints
    const deletionSteps = [
      // 1. Delete conversation-related data first
      { table: 'conversation_memory', filter: { user_id: userId } },
      { table: 'conversation_diagnoses', filter: { user_id: userId } },
      { table: 'conversation_solutions', filter: { user_id: userId } },
      { table: 'messages', filter: {}, join: 'conversations!inner(user_id)' }, // Join to conversations table to filter by user_id
      { table: 'conversations', filter: { user_id: userId } },
      
      // 2. Delete health record related data
      { table: 'health_insights', filter: { user_id: userId } },
      { table: 'health_record_summaries', filter: { user_id: userId } },
      { table: 'health_record_history', filter: { user_id: userId } },
      { table: 'comprehensive_health_reports', filter: { user_id: userId } },
      { table: 'final_medical_analysis', filter: { user_id: userId } },
      { table: 'doctor_notes', filter: { user_id: userId } },
      { table: 'health_records', filter: { user_id: userId } },
      
      // 3. Delete easy chat data
      { table: 'easy_chat_responses', filter: {}, join: 'easy_chat_sessions!inner(user_id)' },
      { table: 'easy_chat_sessions', filter: { user_id: userId } },
      
      // 4. Delete feedback data
      { table: 'diagnosis_feedback', filter: { user_id: userId } },
      { table: 'solution_feedback', filter: { user_id: userId } },
      
      // 5. Delete configuration data
      { table: 'health_data_priorities', filter: { user_id: userId } },
      { table: 'ai_conversation_strategies', filter: { user_id: userId } },
      
      // 6. Finally delete patients (this will cascade to any remaining data)
      { table: 'patients', filter: { user_id: userId } },
    ]

    let deletedCounts: Record<string, number> = {}

    for (const step of deletionSteps) {
      try {
        let query = adminSupabase.from(step.table).delete()
        
        if (step.join) {
          // For tables that need joins (like messages -> conversations)
          const { data: relatedData, error: fetchError } = await adminSupabase
            .from(step.table)
            .select('id', { count: 'exact' })
            .eq('conversation_id', 'in')
            .in('conversation_id', 
              await adminSupabase
                .from('conversations')
                .select('id')
                .eq('user_id', userId)
                .then(({ data }) => data?.map(c => c.id) || [])
            )
          
          if (fetchError) throw fetchError
          
          if (relatedData && relatedData.length > 0) {
            const ids = relatedData.map(item => item.id)
            const { count, error } = await query.in('id', ids)
            if (error) throw error
            deletedCounts[step.table] = count || 0
          } else {
            deletedCounts[step.table] = 0
          }
        } else {
          // Standard deletion by user_id
          const { count, error } = await query
            .eq('user_id', userId)
          
          if (error) throw error
          deletedCounts[step.table] = count || 0
        }
        
        logStep(`Deleted from ${step.table}`, { count: deletedCounts[step.table] })
      } catch (error) {
        logStep(`Error deleting from ${step.table}`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        // Continue with other deletions even if one fails
      }
    }

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)
    
    logStep('Data cleanup completed', { 
      deletedCounts,
      totalDeleted,
      userId 
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All user data cleared successfully',
        deletedCounts,
        totalDeleted
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    logStep('Error during data cleanup', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    console.error('Clear all data error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to clear data',
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})