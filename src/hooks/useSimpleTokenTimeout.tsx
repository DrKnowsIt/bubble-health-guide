import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'drknowsit_token_timeout';

interface SimpleTimeoutState {
  isInTimeout: boolean;
  timeUntilReset: number;
  timeoutEndTimestamp: number | null;
}

/**
 * Simplified token timeout hook - only handles token-based limiting, no daily usage
 */
export const useSimpleTokenTimeout = () => {
  const { user } = useAuth();
  const [timeoutState, setTimeoutState] = useState<SimpleTimeoutState>({
    isInTimeout: false,
    timeUntilReset: 0,
    timeoutEndTimestamp: null
  });

  // Check database for server-side timeout state
  const checkDatabaseTimeout = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_token_limits')
        .select('can_chat, limit_reached_at')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return;

      // If database says can't chat and we have a limit_reached_at timestamp
      if (!data.can_chat && data.limit_reached_at) {
        const limitReachedTime = new Date(data.limit_reached_at).getTime();
        const timeoutEndTimestamp = limitReachedTime + (30 * 60 * 1000); // 30 minutes
        const now = Date.now();
        const timeUntilReset = Math.max(0, timeoutEndTimestamp - now);

        if (timeUntilReset > 0) {
          // Still in timeout - update localStorage and state
          localStorage.setItem(`${STORAGE_KEY}_${user.id}`, timeoutEndTimestamp.toString());
          setTimeoutState({
            isInTimeout: true,
            timeUntilReset,
            timeoutEndTimestamp
          });
          return;
        } else {
          // Timeout should have expired - clear everything
          localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
          setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
        }
      }
    } catch (error) {
      console.error('Error checking database timeout:', error);
    }
  }, [user?.id]);

  // Check localStorage for existing timeout
  const checkStoredTimeout = useCallback(() => {
    if (!user?.id) {
      setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
      return;
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (!stored) {
        setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
        return;
      }

      const timeoutEndTimestamp = parseInt(stored, 10);
      const now = Date.now();
      const timeUntilReset = Math.max(0, timeoutEndTimestamp - now);

      if (timeUntilReset <= 0) {
        // Timeout expired, clear storage
        localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
        setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
      } else {
        // Still in timeout
        setTimeoutState({ 
          isInTimeout: true, 
          timeUntilReset, 
          timeoutEndTimestamp 
        });
      }
    } catch (error) {
      console.error('Error checking stored timeout:', error);
      setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
    }
  }, [user?.id]);

  // Handle 429 error from server
  const handleTokenLimitError = useCallback((errorResponse: any) => {
    if (!user?.id) return;

    try {
      const timeoutEnd = errorResponse.timeout_end || (Date.now() + 30 * 60 * 1000);
      
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, timeoutEnd.toString());
      
      const timeUntilReset = Math.max(0, timeoutEnd - Date.now());
      setTimeoutState({ 
        isInTimeout: true, 
        timeUntilReset, 
        timeoutEndTimestamp: timeoutEnd 
      });

      console.log('Token timeout activated:', {
        timeoutEnd: new Date(timeoutEnd).toLocaleTimeString(),
        timeUntilReset: Math.ceil(timeUntilReset / (1000 * 60)) + ' minutes'
      });
    } catch (error) {
      console.error('Error handling token limit error:', error);
    }
  }, [user?.id]);

  // Clear timeout (for manual clearing if needed)
  const clearTimeout = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Clear database state
      const { error } = await supabase
        .from('user_token_limits')
        .update({
          can_chat: true,
          limit_reached_at: null,
          current_tokens: 0
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to clear database timeout:', error);
        return;
      }

      // Clear localStorage and local state
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
      setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
      
      // Force immediate re-check
      setTimeout(() => {
        checkDatabaseTimeout();
      }, 100);
      
    } catch (error) {
      console.error('Error clearing timeout:', error);
    }
  }, [user?.id, checkDatabaseTimeout]);

  // Check stored timeout on load and user change
  useEffect(() => {
    checkStoredTimeout();
    checkDatabaseTimeout();
  }, [checkStoredTimeout, checkDatabaseTimeout]);

  // Proactive timeout checking - check every 30 seconds
  useEffect(() => {
    const proactiveCheck = async () => {
      if (!user?.id) return;
      
      try {
        await checkDatabaseTimeout();
        
        const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
        if (stored) {
          const timeoutEndTimestamp = parseInt(stored, 10);
          const now = Date.now();
          const timeUntilReset = Math.max(0, timeoutEndTimestamp - now);
          
          if (timeUntilReset > 0 && !timeoutState.isInTimeout) {
            setTimeoutState({ 
              isInTimeout: true, 
              timeUntilReset, 
              timeoutEndTimestamp 
            });
          }
        }
      } catch (error) {
        console.error('Error in proactive timeout check:', error);
      }
    };

    proactiveCheck();
    const interval = setInterval(proactiveCheck, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id, timeoutState.isInTimeout, checkDatabaseTimeout]);

  // Update countdown every second while in timeout
  useEffect(() => {
    if (!timeoutState.isInTimeout || !timeoutState.timeoutEndTimestamp) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeUntilReset = Math.max(0, timeoutState.timeoutEndTimestamp! - now);
      
      if (timeUntilReset <= 0) {
        // Timeout expired
        if (user?.id) {
          localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
        }
        setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
      } else {
        // Update countdown
        setTimeoutState(prev => ({ ...prev, timeUntilReset }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutState.isInTimeout, timeoutState.timeoutEndTimestamp, user?.id]);

  return {
    isInTimeout: timeoutState.isInTimeout,
    timeUntilReset: timeoutState.timeUntilReset,
    handleTokenLimitError,
    clearTimeout
  };
};