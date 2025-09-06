import { useEffect, useCallback } from 'react';

interface SessionData {
  phase?: string;
  selectedAnatomy?: string[];
  conversationPath?: any[];
  sessionId?: string;
  timestamp?: number;
  // Enhanced session data for AI Free Mode
  healthTopics?: any[];
  dynamicQuestion?: any;
  useDynamicQuestions?: boolean;
  currentQuestionId?: string;
  sessionComplete?: boolean;
}

export const useSessionPersistence = (sessionId: string, disabled: boolean = false) => {
  const STORAGE_KEY = `aifreesession_${sessionId}`;
  
  const saveSessionData = useCallback((data: Partial<SessionData>) => {
    if (disabled) return; // No-op when disabled
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const updated = {
        ...existing,
        ...data,
        timestamp: Date.now(),
        sessionId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Session data saved:', {
        ...updated,
        conversationPath: updated.conversationPath?.length || 0,
        healthTopics: updated.healthTopics?.length || 0
      });
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }, [STORAGE_KEY, sessionId, disabled]);

  const loadSessionData = useCallback((): SessionData | null => {
    if (disabled) return null; // No-op when disabled
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      
      // Check if session is still valid (not older than 1 hour)
      if (data.timestamp && Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      console.log('Session data loaded:', {
        ...data,
        conversationPath: data.conversationPath?.length || 0,
        healthTopics: data.healthTopics?.length || 0
      });
      return data;
    } catch (error) {
      console.error('Failed to load session data:', error);
      return null;
    }
  }, [STORAGE_KEY, disabled]);

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