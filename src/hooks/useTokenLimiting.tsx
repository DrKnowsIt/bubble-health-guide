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

  // Load token status immediately and more frequently
  useEffect(() => {
    if (user?.id) {
      refreshTokenStatus();
      
      // Check every 30 seconds for more responsive updates
      const interval = setInterval(() => {
        refreshTokenStatus();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id, refreshTokenStatus]);

  return {
    tokenStatus,
    loading,
    refreshTokenStatus,
    canChat: tokenStatus?.can_chat ?? false,
    currentTokens: tokenStatus?.current_tokens ?? 0,
    timeUntilReset: tokenStatus?.time_until_reset ?? 0,
  };
};