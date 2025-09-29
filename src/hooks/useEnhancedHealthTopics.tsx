import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { useConversationMemory } from './useConversationMemory';
import { useStrategicReferencing } from './useStrategicReferencing';

interface EnhancedHealthTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
  priority_level: 'high' | 'medium' | 'low';
  data_sources: string[];
  risk_factors?: string[];
  recommendations?: string[];
  follow_up_required?: boolean;
}

interface EnhancedHealthSolution {
  solution: string;
  confidence: number;
  reasoning: string;
  category: string;
  timeline: 'immediate' | 'short_term' | 'long_term';
  evidence_strength: 'strong' | 'moderate' | 'weak';
  contraindications?: string[];
  monitoring_required?: boolean;
}

interface UseEnhancedHealthTopicsOptions {
  conversationId?: string | null;
  patientId?: string | null;
  conversationContext?: string;
  includeSolutions?: boolean;
  realTimeUpdates?: boolean;
}

interface TopicFeedback {
  [key: string]: 'positive' | 'negative';
}

interface SolutionFeedback {
  [key: string]: 'helpful' | 'not_helpful';
}

export const useEnhancedHealthTopics = (options: UseEnhancedHealthTopicsOptions) => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  const { memories, insights } = useConversationMemory(options.patientId || undefined);
  const { getStrategicContext } = useStrategicReferencing(options.patientId);

  const [topics, setTopics] = useState<EnhancedHealthTopic[]>([]);
  const [solutions, setSolutions] = useState<EnhancedHealthSolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    topics: TopicFeedback;
    solutions: SolutionFeedback;
  }>({ topics: {}, solutions: {} });

  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const lastAnalysisRef = useRef<string>('');
  const lastAnalysisTimeRef = useRef<number>(0);

  // Generate content hash for comprehensive caching
  const generateContentHash = useCallback(async (content: {
    conversationContext: string;
    memoryData: any;
    strategicContext: any;
    patientId: string | null;
    subscriptionTier: string;
  }): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(content));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  // Load user feedback
  const loadFeedback = useCallback(async () => {
    if (!user?.id || !options.patientId) return;

    try {
      const [topicFeedbackResponse, solutionFeedbackResponse] = await Promise.all([
        supabase
          .from('diagnosis_feedback')
          .select('diagnosis_text, feedback_type')
          .eq('user_id', user.id)
          .eq('patient_id', options.patientId),
        supabase
          .from('solution_feedback')
          .select('solution_text, feedback_type')
          .eq('user_id', user.id)
          .eq('patient_id', options.patientId)
      ]);

      const topicFeedback: TopicFeedback = {};
      const solutionFeedback: SolutionFeedback = {};

      if (topicFeedbackResponse.data) {
        topicFeedbackResponse.data.forEach(item => {
          topicFeedback[item.diagnosis_text] = item.feedback_type as 'positive' | 'negative';
        });
      }

      if (solutionFeedbackResponse.data) {
        solutionFeedbackResponse.data.forEach(item => {
          solutionFeedback[item.solution_text] = item.feedback_type as 'helpful' | 'not_helpful';
        });
      }

      setFeedback({ topics: topicFeedback, solutions: solutionFeedback });
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  }, [user?.id, options.patientId]);

  // Save topic feedback
  const handleTopicFeedback = useCallback(async (topicText: string, feedbackType: 'positive' | 'negative') => {
    if (!user?.id || !options.patientId) return;

    try {
      await supabase.from('diagnosis_feedback').upsert({
        user_id: user.id,
        patient_id: options.patientId,
        diagnosis_text: topicText,
        feedback_type: feedbackType
      });

      setFeedback(prev => ({
        ...prev,
        topics: { ...prev.topics, [topicText]: feedbackType }
      }));
    } catch (error) {
      console.error('Error saving topic feedback:', error);
    }
  }, [user?.id, options.patientId]);

  // Save solution feedback
  const handleSolutionFeedback = useCallback(async (solutionText: string, feedbackType: 'helpful' | 'not_helpful') => {
    if (!user?.id || !options.patientId) return;

    try {
      await supabase.from('solution_feedback').upsert({
        user_id: user.id,
        patient_id: options.patientId,
        solution_text: solutionText,
        feedback_type: feedbackType
      });

      setFeedback(prev => ({
        ...prev,
        solutions: { ...prev.solutions, [solutionText]: feedbackType }
      }));
    } catch (error) {
      console.error('Error saving solution feedback:', error);
    }
  }, [user?.id, options.patientId]);

  // Load existing analysis data
  const loadExistingData = useCallback(async () => {
    if (!options.conversationId || !user?.id) return;

    try {
      const [topicsResponse, solutionsResponse] = await Promise.all([
        supabase
          .from('conversation_diagnoses')
          .select('*')
          .eq('conversation_id', options.conversationId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        options.includeSolutions ? supabase
          .from('conversation_solutions')
          .select('*')
          .eq('conversation_id', options.conversationId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20) : Promise.resolve({ data: [] })
      ]);

      if (topicsResponse.data) {
        const enhancedTopics: EnhancedHealthTopic[] = topicsResponse.data.map(item => ({
          topic: item.diagnosis,
          confidence: item.confidence || 0,
          reasoning: item.reasoning || '',
          category: item.category || 'other',
          priority_level: 'medium',
          data_sources: ['conversation'],
          follow_up_required: item.confidence && item.confidence > 0.7
        }));
        setTopics(enhancedTopics);
      }

      if (solutionsResponse.data) {
        const enhancedSolutions: EnhancedHealthSolution[] = solutionsResponse.data.map(item => ({
          solution: item.solution,
          confidence: item.confidence || 0,
          reasoning: item.reasoning || '',
          category: item.category || 'other',
          timeline: 'short_term' as const,
          evidence_strength: 'moderate' as const,
          monitoring_required: item.confidence && item.confidence > 0.6,
          products: item.products || []
        }));
        setSolutions(enhancedSolutions);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }, [options.conversationId, options.includeSolutions, user?.id]);

  // Enhanced analysis with comprehensive data
  const analyzeHealthTopics = useCallback(async (force: boolean = false) => {
    if (!user?.id || !options.patientId || !options.conversationContext?.trim()) {
      return;
    }

    // Rate limiting - at most once every 3 seconds unless forced
    const now = Date.now();
    if (!force && (now - lastAnalysisTimeRef.current) < 3000) {
      return;
    }

    try {
      setLoading(true);

      // Gather comprehensive context
      const strategicContext = await getStrategicContext();
      const memoryData = {
        memories: memories || [],
        insights: insights || []
      };

      // Create comprehensive content hash
      const contentForHashing = {
        conversationContext: options.conversationContext,
        memoryData,
        strategicContext,
        patientId: options.patientId,
        subscriptionTier: subscription_tier || 'free'
      };

      const contentHash = await generateContentHash(contentForHashing);
      
      // Skip if content hasn't changed and not forced
      if (!force && contentHash === lastAnalysisRef.current) {
        setLoading(false);
        return;
      }

      lastAnalysisRef.current = contentHash;
      lastAnalysisTimeRef.current = now;

      // Call enhanced analysis function
      const { data, error } = await supabase.functions.invoke('analyze-health-topics', {
        body: {
          patient_id: options.patientId,
          conversation_id: options.conversationId,
          conversation_context: options.conversationContext,
          include_solutions: options.includeSolutions,
          enhanced_mode: true,
          memory_data: memoryData,
          strategic_context: strategicContext,
          subscription_tier: subscription_tier || 'basic',
          analysis_type: 'comprehensive'
        }
      });

      if (error) {
        console.error('Error analyzing enhanced health topics:', error);
        return;
      }

      if (data?.topics) {
        setTopics(data.topics);
      }

      if (data?.solutions && options.includeSolutions) {
        setSolutions(data.solutions);
      }

    } catch (error) {
      console.error('Error in enhanced health topics analysis:', error);
    } finally {
      setLoading(false);
    }
  }, [
    user?.id, 
    options.patientId, 
    options.conversationId, 
    options.conversationContext, 
    options.includeSolutions,
    memories,
    insights,
    getStrategicContext,
    subscription_tier,
    generateContentHash
  ]);

  // Refresh analysis
  const refreshAnalysis = useCallback(() => {
    analyzeHealthTopics(true);
  }, [analyzeHealthTopics]);

  // Debounced analysis trigger - re-enabled for real-time health topics
  useEffect(() => {
    if (!options.conversationContext?.trim()) return;
    
    // Clear any existing timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    // Debounce analysis for 2 seconds after conversation context changes
    analysisTimeoutRef.current = setTimeout(() => {
      console.log('[useEnhancedHealthTopics] Auto-triggering analysis due to context change');
      analyzeHealthTopics(false);
    }, 2000);
    
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [options.conversationContext, analyzeHealthTopics]);

  // Initial data loading
  useEffect(() => {
    if (user?.id && options.patientId) {
      loadFeedback();
      loadExistingData();
    }
  }, [user?.id, options.patientId, loadFeedback, loadExistingData]);

  // Real-time subscriptions with enhanced reload logic
  useEffect(() => {
    if (!options.realTimeUpdates || !user?.id || !options.conversationId) return;

    console.log('[useEnhancedHealthTopics] Setting up real-time subscriptions for:', options.conversationId);

    const topicsChannel = supabase
      .channel(`enhanced-topics-${options.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${options.conversationId}`
        },
        (payload) => {
          console.log('[useEnhancedHealthTopics] Topics change detected:', payload);
          // Small delay to ensure data is committed
          setTimeout(() => {
            loadExistingData();
          }, 100);
        }
      )
      .subscribe();

    let solutionsChannel: any = null;
    if (options.includeSolutions) {
      solutionsChannel = supabase
        .channel(`enhanced-solutions-${options.conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_solutions',
            filter: `conversation_id=eq.${options.conversationId}`
          },
          (payload) => {
            console.log('[useEnhancedHealthTopics] Solutions change detected:', payload);
            // Small delay to ensure data is committed
            setTimeout(() => {
              loadExistingData();
            }, 100);
          }
        )
        .subscribe();
    }

    return () => {
      console.log('[useEnhancedHealthTopics] Cleaning up real-time subscriptions');
      supabase.removeChannel(topicsChannel);
      if (solutionsChannel) {
        supabase.removeChannel(solutionsChannel);
      }
    };
  }, [options.realTimeUpdates, options.conversationId, options.includeSolutions, user?.id, loadExistingData]);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const isEmpty = topics.length === 0;
    const solutionsEmpty = solutions.length === 0;
    
    const highPriorityTopics = topics.filter(t => t.priority_level === 'high');
    const followUpRequired = topics.filter(t => t.follow_up_required);
    const immediateActions = solutions.filter(s => s.timeline === 'immediate');

    return {
      isEmpty,
      solutionsEmpty,
      highPriorityTopics,
      followUpRequired,
      immediateActions,
      totalDataSources: new Set(topics.flatMap(t => t.data_sources)).size
    };
  }, [topics, solutions]);

  return {
    topics,
    solutions,
    loading,
    feedback,
    handleTopicFeedback,
    handleSolutionFeedback,
    refreshAnalysis,
    analyzeHealthTopics, // Expose for external triggers
    ...computedValues
  };
};