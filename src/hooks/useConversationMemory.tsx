import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ConversationMemory {
  id: string;
  conversation_id: string;
  patient_id: string;
  memory: any;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryInsight {
  key: string;
  value: any;
  timestamp: string;
  conversation_id: string;
  category: 'medical_fact' | 'symptom' | 'preference' | 'history' | 'other';
}

export const useConversationMemory = (patientId?: string) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<ConversationMemory[]>([]);
  const [insights, setInsights] = useState<MemoryInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const previousPatientIdRef = useRef<string | undefined>();
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchMemories = useCallback(async () => {
    // Early return if no user
    if (!user) {
      console.log('🔍 ConversationMemory: No user', { user: !!user });
      setMemories([]);
      setInsights([]);
      setIsInitialLoad(false);
      return;
    }

    // Early return if no patientId
    if (!patientId) {
      console.log('🔍 ConversationMemory: No patientId', { patientId });
      setMemories([]);
      setInsights([]);
      setIsInitialLoad(false);
      return;
    }

    // Skip fetch if same patient (prevents unnecessary re-fetches)
    if (previousPatientIdRef.current === patientId && !isInitialLoad) {
      console.log('🔍 ConversationMemory: Same patient, skipping fetch', { patientId });
      return;
    }

    console.log('🔍 ConversationMemory: Fetching memories for', { userId: user.id, patientId });
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('patient_id', patientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const memoryData = data || [];
      console.log('🔍 ConversationMemory: Found memories', { count: memoryData.length, memories: memoryData });
      setMemories(memoryData);

      // Extract insights from memory objects
      const extractedInsights: MemoryInsight[] = [];
      
      memoryData.forEach(memory => {
        if (memory.memory && typeof memory.memory === 'object') {
          Object.entries(memory.memory).forEach(([key, value]) => {
            if (value && key !== 'conversation_id' && key !== 'last_updated') {
              const category = categorizeInsight(key);
              
              // Handle new structured memory format
              if (typeof value === 'object' && value !== null) {
                if (key === 'symptoms' && typeof value === 'object') {
                  // Handle symptoms object with nested symptom entries
                  Object.entries(value).forEach(([symptomName, symptomData]) => {
                    extractedInsights.push({
                      key: symptomName,
                      value: symptomData,
                      timestamp: memory.updated_at,
                      conversation_id: memory.conversation_id,
                      category: 'symptom'
                    });
                  });
                } else if (Array.isArray(value)) {
                  // Handle arrays (medical_history, current_medications, etc.)
                  value.forEach((item, index) => {
                    extractedInsights.push({
                      key: `${key}_${index}`,
                      value: item,
                      timestamp: memory.updated_at,
                      conversation_id: memory.conversation_id,
                      category
                    });
                  });
                } else if (typeof value === 'object') {
                  // Handle other object types (lifestyle_factors, etc.)
                  Object.entries(value).forEach(([subKey, subValue]) => {
                    extractedInsights.push({
                      key: `${key}_${subKey}`,
                      value: subValue,
                      timestamp: memory.updated_at,
                      conversation_id: memory.conversation_id,
                      category
                    });
                  });
                } else {
                  // Handle simple object with description/details
                  extractedInsights.push({
                    key,
                    value,
                    timestamp: memory.updated_at,
                    conversation_id: memory.conversation_id,
                    category
                  });
                }
              } else {
                // Handle simple key-value pairs (legacy format)
                extractedInsights.push({
                  key,
                  value,
                  timestamp: memory.updated_at,
                  conversation_id: memory.conversation_id,
                  category
                });
              }
            }
          });
        }
      });

      // Sort insights by timestamp, most recent first
      extractedInsights.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log('🔍 ConversationMemory: Extracted insights', { count: extractedInsights.length, insights: extractedInsights });
      setInsights(extractedInsights);
      
      // Update refs
      previousPatientIdRef.current = patientId;
    } catch (error) {
      console.error('❌ ConversationMemory: Error fetching conversation memory:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user?.id, patientId, isInitialLoad]);

  const categorizeInsight = (key: string): MemoryInsight['category'] => {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('symptom') || keyLower.includes('pain') || keyLower.includes('discomfort')) {
      return 'symptom';
    }
    if (keyLower.includes('medical') || keyLower.includes('diagnosis') || keyLower.includes('condition')) {
      return 'medical_fact';
    }
    if (keyLower.includes('prefer') || keyLower.includes('like') || keyLower.includes('want')) {
      return 'preference';
    }
    if (keyLower.includes('history') || keyLower.includes('past') || keyLower.includes('previous')) {
      return 'history';
    }
    return 'other';
  };

  const getMemoryStats = () => {
    const totalMemories = memories.length;
    const totalInsights = insights.length;
    const categories = insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lastMemoryUpdate = memories.length > 0 
      ? new Date(memories[0].updated_at) 
      : null;

    return {
      totalMemories,
      totalInsights,
      categories,
      lastMemoryUpdate,
      hasMemories: totalMemories > 0
    };
  };

  const getRecentInsights = (limit: number = 5) => {
    return insights.slice(0, limit);
  };

  const getInsightsByCategory = (category: MemoryInsight['category']) => {
    return insights.filter(insight => insight.category === category);
  };

  const formatInsightValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Debounced effect to prevent rapid fetches on user selection changes
  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Reset initial load state when patient changes
    if (previousPatientIdRef.current !== patientId) {
      setIsInitialLoad(true);
    }

    // Debounce the fetch call
    fetchTimeoutRef.current = setTimeout(() => {
      fetchMemories();
    }, 150); // 150ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchMemories]);

  // Memoize utility functions to prevent unnecessary re-renders
  const memoizedUtils = useMemo(() => ({
    getMemoryStats: () => {
      const totalMemories = memories.length;
      const totalInsights = insights.length;
      const categories = insights.reduce((acc, insight) => {
        acc[insight.category] = (acc[insight.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastMemoryUpdate = memories.length > 0 
        ? new Date(memories[0].updated_at) 
        : null;

      return {
        totalMemories,
        totalInsights,
        categories,
        lastMemoryUpdate,
        hasMemories: totalMemories > 0
      };
    },
    getRecentInsights: (limit: number = 5) => insights.slice(0, limit),
    getInsightsByCategory: (category: MemoryInsight['category']) => 
      insights.filter(insight => insight.category === category),
    formatInsightValue: (value: any): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }
  }), [memories, insights]);

  return {
    memories,
    insights,
    loading: loading || isInitialLoad,
    isInitialLoad,
    fetchMemories,
    ...memoizedUtils
  };
};