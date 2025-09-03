import { useEffect, useCallback } from 'react';

interface SessionData {
  phase?: string;
  selectedAnatomy?: string[];
  conversationPath?: any[];
  sessionId?: string;
  timestamp?: number;
}

export const useSessionPersistence = (sessionId: string) => {
  const STORAGE_KEY = `aifreesession_${sessionId}`;
  
  const saveSessionData = useCallback((data: Partial<SessionData>) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const updated = {
        ...existing,
        ...data,
        timestamp: Date.now(),
        sessionId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Session data saved:', updated);
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }, [STORAGE_KEY, sessionId]);

  const loadSessionData = useCallback((): SessionData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Check if session is still valid (not older than 1 hour)
      if (data.timestamp && Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      console.log('Session data loaded:', data);
      return data;
    } catch (error) {
      console.error('Failed to load session data:', error);
      return null;
    }
  }, [STORAGE_KEY]);

  const clearSessionData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Session data cleared for:', sessionId);
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }, [STORAGE_KEY, sessionId]);

  // Auto-cleanup on unmount or session completion
  useEffect(() => {
    return () => {
      // Only clear if session is very old (more than 2 hours)
      const data = loadSessionData();
      if (data?.timestamp && Date.now() - data.timestamp > 7200000) {
        clearSessionData();
      }
    };
  }, [loadSessionData, clearSessionData]);

  return {
    saveSessionData,
    loadSessionData,
    clearSessionData
  };
};