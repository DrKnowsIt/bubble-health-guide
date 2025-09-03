import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

interface HealthTopic {
  id?: string;
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
  updated_at?: string;
}

interface HealthSolution {
  id?: string;
  solution: string;
  confidence: number;
  reasoning: string;
  category: string;
  updated_at?: string;
}

interface UseHealthTopicsOptions {
  conversationId?: string;
  patientId: string;
  conversationContext: string;
  conversationType?: 'easy_chat' | 'regular_chat';
  selectedAnatomy?: string[];
  includeSolutions?: boolean;
  minContextLength?: number;
}

export const useHealthTopics = ({
  conversationId,
  patientId,
  conversationContext,
  conversationType = 'regular_chat',
  selectedAnatomy = [],
  includeSolutions = true,
  minContextLength = 20
}: UseHealthTopicsOptions) => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  
  const [topics, setTopics] = useState<HealthTopic[]>([]);
  const [solutions, setSolutions] = useState<HealthSolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState<string>('');
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const lastAnalysisRef = useRef<Date>(new Date(0));

  // Smart caching - generate content hash
  const generateContentHash = useCallback(async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }, []);

  // Load existing feedback
  const loadFeedback = useCallback(async () => {
    if (!user?.id || !patientId) return;

    try {
      // Load topic feedback
      const { data: topicFeedback } = await supabase
        .from('diagnosis_feedback')
        .select('diagnosis_text, feedback_type')
        .eq('user_id', user.id)
        .eq('patient_id', patientId);

      // Load solution feedback
      const { data: solutionFeedback } = await supabase
        .from('solution_feedback')
        .select('solution_text, feedback_type')
        .eq('user_id', user.id)
        .eq('patient_id', patientId);

      const feedbackMap: Record<string, string> = {};
      
      topicFeedback?.forEach((item: any) => {
        feedbackMap[item.diagnosis_text] = item.feedback_type;
      });
      
      solutionFeedback?.forEach((item: any) => {
        feedbackMap[item.solution_text] = item.feedback_type;
      });

      setFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  }, [user?.id, patientId]);

  // Handle feedback submission
  const handleTopicFeedback = useCallback(async (topicText: string, feedbackType: 'positive' | 'negative') => {
    if (!user?.id || !patientId) return;

    try {
      await supabase
        .from('diagnosis_feedback')
        .upsert({
          user_id: user.id,
          patient_id: patientId,
          diagnosis_text: topicText,
          feedback_type: feedbackType,
          created_at: new Date().toISOString(),
        });

      setFeedback(prev => ({ ...prev, [topicText]: feedbackType }));
    } catch (error) {
      console.error('Error saving topic feedback:', error);
    }
  }, [user?.id, patientId]);

  const handleSolutionFeedback = useCallback(async (solutionText: string, feedbackType: 'helpful' | 'not_helpful') => {
    if (!user?.id || !patientId) return;

    try {
      await supabase
        .from('solution_feedback')
        .upsert({
          user_id: user.id,
          patient_id: patientId,
          solution_text: solutionText,
          feedback_type: feedbackType
        });

      setFeedback(prev => ({ ...prev, [solutionText]: feedbackType }));
    } catch (error) {
      console.error('Error saving solution feedback:', error);
    }
  }, [user?.id, patientId]);

  // Debounced analysis function
  const analyzeHealthTopics = useCallback(async (force = false) => {
    if (!user?.id || !patientId || conversationContext.length < minContextLength) {
      return;
    }

    // Rate limiting - prevent too frequent calls
    const now = new Date();
    if (!force && now.getTime() - lastAnalysisRef.current.getTime() < 30000) {
      console.log('Rate limiting analysis - too frequent');
      return;
    }

    try {
      const contentHash = await generateContentHash(conversationContext);
      
      // Skip if content hasn't changed significantly
      if (!force && contentHash === lastAnalyzedHash) {
        console.log('Skipping analysis - content unchanged');
        return;
      }

      setLoading(true);
      lastAnalysisRef.current = now;

      console.log(`Analyzing health topics for ${conversationType} (${subscription_tier || 'free'} user)`);

      const { data, error } = await supabase.functions.invoke('analyze-health-topics', {
        body: {
          conversation_id: conversationId,
          patient_id: patientId,
          conversation_context: conversationContext,
          conversation_type: conversationType,
          user_tier: subscription_tier || 'free',
          selected_anatomy: selectedAnatomy,
          include_solutions: includeSolutions
        }
      });

      if (error) {
        console.error('Error analyzing health topics:', error);
        return;
      }

      if (data?.topics) {
        console.log(`Generated ${data.topics.length} topics${data.solutions ? ` and ${data.solutions.length} solutions` : ''}`);
        
        setTopics(data.topics);
        if (includeSolutions && data.solutions) {
          setSolutions(data.solutions);
        }
        setLastAnalyzedHash(contentHash);
      }
    } catch (error) {
      console.error('Error in health topics analysis:', error);
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    patientId,
    conversationContext,
    conversationType,
    subscription_tier,
    selectedAnatomy,
    includeSolutions,
    conversationId,
    minContextLength,
    lastAnalyzedHash,
    generateContentHash
  ]);

  // Load existing data from database
  const loadExistingData = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    try {
      // Load existing topics
      const { data: existingTopics } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('patient_id', patientId)
        .order('confidence', { ascending: false });

      if (existingTopics && existingTopics.length > 0) {
        const formattedTopics = existingTopics.map(t => ({
          id: t.id,
          topic: t.diagnosis,
          confidence: t.confidence,
          reasoning: t.reasoning,
          category: 'other', // Default category since DB doesn't have this field yet
          updated_at: t.updated_at
        }));
        setTopics(formattedTopics);
      }

      // Load existing solutions if requested
      if (includeSolutions) {
        const { data: existingSolutions } = await supabase
          .from('conversation_solutions')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('confidence', { ascending: false });

        if (existingSolutions && existingSolutions.length > 0) {
          setSolutions(existingSolutions);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }, [conversationId, user?.id, patientId, includeSolutions]);

  // Debounced analysis trigger
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      analyzeHealthTopics();
    }, 1000); // 1 second debounce

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [conversationContext, analyzeHealthTopics]);

  // Load existing feedback and data on mount
  useEffect(() => {
    loadFeedback();
    loadExistingData();
  }, [loadFeedback, loadExistingData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    console.log('Setting up real-time subscriptions for health topics');

    const topicsChannel = supabase
      .channel('health-topics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          console.log('Real-time topic update detected');
          loadExistingData();
        }
      )
      .subscribe();

    const solutionsChannel = includeSolutions ? supabase
      .channel('health-solutions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_solutions',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          console.log('Real-time solution update detected');
          loadExistingData();
        }
      )
      .subscribe() : null;

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(topicsChannel);
      if (solutionsChannel) {
        supabase.removeChannel(solutionsChannel);
      }
    };
  }, [conversationId, user?.id, includeSolutions, loadExistingData]);

  // Force refresh function
  const refreshAnalysis = useCallback(() => {
    analyzeHealthTopics(true);
  }, [analyzeHealthTopics]);

  return {
    topics,
    solutions,
    loading,
    feedback,
    handleTopicFeedback,
    handleSolutionFeedback,
    refreshAnalysis,
    isEmpty: topics.length === 0,
    solutionsEmpty: solutions.length === 0
  };
};