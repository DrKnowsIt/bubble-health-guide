import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getTokenStatus, initializeUserTokens, type TokenStatus } from '@/utils/tokenLimiting';
import { toast } from 'sonner';

export const useTokenLimiting = () => {
  const { user } = useAuth();
  
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTokenStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const status = await getTokenStatus(user.id);
      setTokenStatus(status);
    } catch (error) {
      console.error('Error refreshing token status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initialize tokens for new users
  useEffect(() => {
    if (user?.id) {
      initializeUserTokens(user.id);
    }
  }, [user?.id]);

  // Load token status
  useEffect(() => {
    if (user?.id) {
      refreshTokenStatus();
    }
  }, [user?.id, refreshTokenStatus]);

  // Auto-refresh token status every minute to check for resets
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      refreshTokenStatus();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [user?.id, refreshTokenStatus]);

  // Token status changes are handled by individual chat interfaces
  // No global toast notifications needed

  return {
    tokenStatus,
    loading,
    refreshTokenStatus,
    canChat: tokenStatus?.can_chat ?? false,
    currentTokens: tokenStatus?.current_tokens ?? 0,
    timeUntilReset: tokenStatus?.time_until_reset ?? 0,
  };
};