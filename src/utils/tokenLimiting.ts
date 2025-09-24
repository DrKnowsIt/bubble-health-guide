import { supabase } from '@/integrations/supabase/client';

// Token limit before timeout (300 tokens)
export const TOKEN_LIMIT = 300;

// Timeout duration in milliseconds (30 minutes)
export const TIMEOUT_DURATION = 30 * 60 * 1000;

export interface TokenStatus {
  current_tokens: number;
  can_chat: boolean;
  limit_reached_at?: string;
  time_until_reset?: number; // milliseconds
}

export async function initializeUserTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_token_limits')
      .upsert({
        user_id: userId,
        current_tokens: 0,
        can_chat: true,
        limit_reached_at: null
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Error initializing user tokens:', error);
    }
  } catch (error) {
    console.error('Error in initializeUserTokens:', error);
  }
}

export async function getTokenStatus(userId: string): Promise<TokenStatus | null> {
  try {
    const { data, error } = await supabase
      .from('user_token_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching token status:', error);
      return null;
    }
    
    if (!data) {
      // Initialize tokens for new user
      await initializeUserTokens(userId);
      return getTokenStatus(userId);
    }
    
    // Check if timeout has expired
    if (data.limit_reached_at) {
      const now = new Date();
      const timeoutEnd = new Date(new Date(data.limit_reached_at).getTime() + TIMEOUT_DURATION);
      const timeUntilReset = timeoutEnd.getTime() - now.getTime();
      
      if (timeUntilReset <= 0) {
        // Reset the user's tokens
        await resetUserTokens(userId);
        return getTokenStatus(userId);
      }
      
      return {
        current_tokens: data.current_tokens,
        can_chat: false,
        limit_reached_at: data.limit_reached_at,
        time_until_reset: Math.max(0, timeUntilReset)
      };
    }
    
    return {
      current_tokens: data.current_tokens,
      can_chat: data.can_chat,
      time_until_reset: 0
    };
  } catch (error) {
    console.error('Error in getTokenStatus:', error);
    return null;
  }
}

export async function addTokens(userId: string, tokensToAdd: number): Promise<{ success: boolean; timeout_triggered: boolean }> {
  try {
    // Use edge function to handle token addition atomically
    const { data, error } = await supabase.functions.invoke('track-tokens', {
      body: {
        user_id: userId,
        tokens_to_add: tokensToAdd
      }
    });
    
    if (error) {
      console.error('Error adding tokens:', error);
      return { success: false, timeout_triggered: false };
    }
    
    return data;
  } catch (error) {
    console.error('Error in addTokens:', error);
    return { success: false, timeout_triggered: false };
  }
}

export async function resetUserTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_token_limits')
      .update({
        current_tokens: 0,
        can_chat: true,
        limit_reached_at: null
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error resetting user tokens:', error);
    }
  } catch (error) {
    console.error('Error in resetUserTokens:', error);
  }
}

export function formatTimeUntilReset(milliseconds: number): string {
  const totalMinutes = Math.ceil(milliseconds / (1000 * 60));
  
  if (totalMinutes <= 1) {
    return '1 minute';
  }
  
  return `${totalMinutes} minutes`;
}