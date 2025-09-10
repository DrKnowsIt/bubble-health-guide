import { supabase } from '@/integrations/supabase/client';

// Rate limits by subscription tier (messages per day)
export const RATE_LIMITS = {
  free: 10,
  basic: 100,
  pro: 500,
  enterprise: 1000
} as const;

// Token costs per 1K tokens (USD)
export const TOKEN_COSTS = {
  'gpt-5-2025-08-07': { input: 0.003, output: 0.015 },
  'gpt-5-mini-2025-08-07': { input: 0.0015, output: 0.006 },
  'gpt-5-nano-2025-08-07': { input: 0.0003, output: 0.0012 },
  'gpt-4.1-2025-04-14': { input: 0.003, output: 0.015 },
  'o3-2025-04-16': { input: 0.015, output: 0.060 },
  'o4-mini-2025-04-16': { input: 0.003, output: 0.012 },
  'gpt-4.1-mini-2025-04-14': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'grok-beta': { input: 0.002, output: 0.010 } // Estimated
} as const;

export interface UsageTrackingData {
  user_id: string;
  patient_id?: string;
  function_name: string;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  request_type: 'chat' | 'analysis' | 'diagnosis' | 'summary' | 'health-topics' | 'memory';
  subscription_tier?: string;
}

export interface DailyUsage {
  messages_used: number;
  tokens_used: number;
  cost_incurred: number;
  limit_reached: boolean;
}

export function calculateTokenCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelKey = model as keyof typeof TOKEN_COSTS;
  const costs = TOKEN_COSTS[modelKey];
  
  if (!costs) {
    console.warn(`Unknown model for cost calculation: ${model}`);
    return 0;
  }
  
  const inputCost = (inputTokens / 1000) * costs.input;
  const outputCost = (outputTokens / 1000) * costs.output;
  
  return inputCost + outputCost;
}

export async function trackUsage(data: UsageTrackingData): Promise<void> {
  const totalTokens = data.input_tokens + data.output_tokens;
  const estimatedCost = calculateTokenCost(data.model_used, data.input_tokens, data.output_tokens);
  
  try {
    // Track individual usage
    const { error: trackingError } = await supabase
      .from('ai_usage_tracking')
      .insert({
        ...data,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost
      });
    
    if (trackingError) {
      console.error('Error tracking usage:', trackingError);
      return;
    }
    
    // Update daily usage limits
    const today = new Date().toISOString().split('T')[0];
    
    // Use edge function to handle daily usage increment
    const { error: incrementError } = await supabase.functions.invoke('increment-daily-usage', {
      body: {
        p_user_id: data.user_id,
        p_date: today,
        p_messages: 1,
        p_tokens: totalTokens,
        p_cost: estimatedCost
      }
    });
    
    if (incrementError) {
      console.error('Error updating daily usage:', incrementError);
    }
  } catch (error) {
    console.error('Error in trackUsage:', error);
  }
}

export async function checkRateLimit(userId: string, subscriptionTier: string = 'basic'): Promise<{ allowed: boolean; usage: DailyUsage }> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from('daily_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking rate limit:', error);
      return { 
        allowed: true, 
        usage: { messages_used: 0, tokens_used: 0, cost_incurred: 0, limit_reached: false } 
      };
    }
    
    const currentUsage = data?.messages_used || 0;
    const tierKey = subscriptionTier.toLowerCase() as keyof typeof RATE_LIMITS;
    const limit = RATE_LIMITS[tierKey] || RATE_LIMITS.basic;
    
    const usage: DailyUsage = {
      messages_used: currentUsage,
      tokens_used: data?.tokens_used || 0,
      cost_incurred: data?.cost_incurred || 0,
      limit_reached: currentUsage >= limit
    };
    
    return {
      allowed: currentUsage < limit,
      usage
    };
  } catch (error) {
    console.error('Error in checkRateLimit:', error);
    return { 
      allowed: true, 
      usage: { messages_used: 0, tokens_used: 0, cost_incurred: 0, limit_reached: false } 
    };
  }
}

export async function getUserUsageStats(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  try {
    const { data, error } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching usage stats:', error);
      return null;
    }
    
    const totalCost = data?.reduce((sum, record) => sum + (record.estimated_cost || 0), 0) || 0;
    const totalTokens = data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;
    const totalMessages = data?.length || 0;
    
    return {
      totalMessages,
      totalTokens,
      totalCost,
      records: data
    };
  } catch (error) {
    console.error('Error in getUserUsageStats:', error);
    return null;
  }
}