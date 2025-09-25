import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'drknowsit_token_timeout';

interface TimeoutState {
  isInTimeout: boolean;
  timeUntilReset: number;
  timeoutEndTimestamp: number | null;
}

export const useTokenTimeout = () => {
  const { user } = useAuth();
  const [timeoutState, setTimeoutState] = useState<TimeoutState>({
    isInTimeout: false,
    timeUntilReset: 0,
    timeoutEndTimestamp: null
  });

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
      const timeoutEnd = errorResponse.timeout_end || (Date.now() + 30 * 60 * 1000); // Default 30 min
      
      // Store timeout end timestamp
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, timeoutEnd.toString());
      
      const timeUntilReset = Math.max(0, timeoutEnd - Date.now());
      setTimeoutState({ 
        isInTimeout: true, 
        timeUntilReset, 
        timeoutEndTimestamp: timeoutEnd 
      });

      console.log('🔒 Token timeout activated:', {
        timeoutEnd: new Date(timeoutEnd).toLocaleTimeString(),
        timeUntilReset: Math.ceil(timeUntilReset / (1000 * 60)) + ' minutes'
      });
    } catch (error) {
      console.error('Error handling token limit error:', error);
    }
  }, [user?.id]);

  // Clear timeout (for manual clearing if needed)
  const clearTimeout = useCallback(() => {
    if (!user?.id) return;
    
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setTimeoutState({ isInTimeout: false, timeUntilReset: 0, timeoutEndTimestamp: null });
  }, [user?.id]);

  // Check stored timeout on load and user change
  useEffect(() => {
    checkStoredTimeout();
  }, [checkStoredTimeout]);

  // Proactive timeout checking - check every 30 seconds if we should be in timeout
  useEffect(() => {
    const proactiveCheck = () => {
      if (!user?.id) return;
      
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
        if (stored) {
          const timeoutEndTimestamp = parseInt(stored, 10);
          const now = Date.now();
          const timeUntilReset = Math.max(0, timeoutEndTimestamp - now);
          
          if (timeUntilReset > 0 && !timeoutState.isInTimeout) {
            console.log('🔍 [useTokenTimeout] Proactive check: Found active timeout, activating');
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

    // Check immediately and then every 30 seconds
    proactiveCheck();
    const interval = setInterval(proactiveCheck, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id, timeoutState.isInTimeout]);

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