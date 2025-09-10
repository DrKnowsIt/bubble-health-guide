import { supabase } from '@/integrations/supabase/client';

// Gem limits by subscription tier (every 3 hours)
export const GEM_LIMITS = {
  basic: 50,
  pro: 200,
  enterprise: 500
} as const;

// Token to gem conversion (1000 tokens = 1 gem approximately)
export const TOKENS_PER_GEM = 1000;

export interface GemStatus {
  current_gems: number;
  max_gems: number;
  next_reset_at: string;
  can_chat: boolean;
  time_until_reset?: number; // milliseconds
}

export function calculateGemsFromTokens(inputTokens: number, outputTokens: number): number {
  const totalTokens = inputTokens + outputTokens;
  return Math.ceil(totalTokens / TOKENS_PER_GEM);
}

export async function initializeUserGems(userId: string, subscriptionTier: string = 'basic'): Promise<void> {
  const tierKey = subscriptionTier.toLowerCase() as keyof typeof GEM_LIMITS;
  const maxGems = GEM_LIMITS[tierKey] || GEM_LIMITS.basic;
  
  try {
    const { error } = await supabase
      .from('user_gems')
      .upsert({
        user_id: userId,
        current_gems: maxGems,
        max_gems: maxGems,
        subscription_tier: subscriptionTier,
        last_reset_at: new Date().toISOString(),
        next_reset_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours from now
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Error initializing user gems:', error);
    }
  } catch (error) {
    console.error('Error in initializeUserGems:', error);
  }
}

export async function getGemStatus(userId: string): Promise<GemStatus | null> {
  try {
    const { data, error } = await supabase
      .from('user_gems')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching gem status:', error);
      return null;
    }
    
    if (!data) {
      // Initialize gems for new user
      await initializeUserGems(userId);
      return getGemStatus(userId);
    }
    
    const now = new Date();
    const nextReset = new Date(data.next_reset_at);
    const timeUntilReset = nextReset.getTime() - now.getTime();
    
    // Auto-reset if time has passed
    if (timeUntilReset <= 0) {
      await resetGems(userId);
      return getGemStatus(userId);
    }
    
    return {
      current_gems: data.current_gems,
      max_gems: data.max_gems,
      next_reset_at: data.next_reset_at,
      can_chat: data.current_gems > 0,
      time_until_reset: Math.max(0, timeUntilReset)
    };
  } catch (error) {
    console.error('Error in getGemStatus:', error);
    return null;
  }
}

export async function deductGems(userId: string, gemsToDeduct: number): Promise<{ success: boolean; remaining_gems: number }> {
  try {
    // Use edge function to handle gem deduction atomically
    const { data, error } = await supabase.functions.invoke('deduct-gems', {
      body: {
        user_id: userId,
        gems_to_deduct: gemsToDeduct
      }
    });
    
    if (error) {
      console.error('Error deducting gems:', error);
      return { success: false, remaining_gems: 0 };
    }
    
    return data;
  } catch (error) {
    console.error('Error in deductGems:', error);
    return { success: false, remaining_gems: 0 };
  }
}

export async function resetGems(userId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('reset-gems', {
      body: { user_id: userId }
    });
    
    if (error) {
      console.error('Error resetting gems:', error);
    }
  } catch (error) {
    console.error('Error in resetGems:', error);
  }
}

export function formatTimeUntilReset(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}