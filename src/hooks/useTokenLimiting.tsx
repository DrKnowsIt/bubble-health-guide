import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getTokenStatus, initializeUserTokens, type TokenStatus } from '@/utils/tokenLimiting';
import { toast } from 'sonner';

export const useTokenLimiting = () => {
  const { user } = useAuth();
  
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTokenStatus = useCallback(async () => {
    if (!user?.id) {
      setTokenStatus(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔄 Refreshing token status for user:', user.id);
      const status = await getTokenStatus(user.id);
      console.log('📊 Current token status:', status);
      setTokenStatus(status);
    } catch (error) {
      console.error('Error refreshing token status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initialize tokens for new users and ensure proper state on app load
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Initializing tokens for user:', user.id);
      initializeUserTokens(user.id);
      // Immediately check status on user login/app load
      refreshTokenStatus();
    }
  }, [user?.id, refreshTokenStatus]);

  // Load token status immediately and more frequently
  useEffect(() => {
    if (user?.id) {
      // Check immediately on load
      refreshTokenStatus();
      
      // Check every 10 seconds for more responsive updates when in timeout
      const interval = setInterval(() => {
        refreshTokenStatus();
      }, 10000);
      
      return () => clearInterval(interval);
    } else {
      // Clear token status when no user
      setTokenStatus(null);
      setLoading(false);
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