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

interface ProductSuggestion {
  name: string;
  price: string;
  rating: number;
  amazonUrl: string;
  imageUrl: string;
  category: string;
}

interface HealthSolution {
  id?: string;
  solution: string;
  confidence: number;
  reasoning: string;
  category: string;
  updated_at?: string;
  products?: ProductSuggestion[];
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

  // Debounced analysis function with retry logic
  const analyzeHealthTopics = useCallback(async (force = false) => {
    if (!user?.id || !patientId || conversationContext.length < minContextLength) {
      console.log('[HealthTopics] Skipping analysis - insufficient data', { 
        hasUser: !!user?.id, 
        hasPatient: !!patientId, 
        contextLength: conversationContext.length, 
        minRequired: minContextLength 
      });
      return;
    }

    // Rate limiting - prevent too frequent calls (reduced from 30s to 15s)
    const now = new Date();
    if (!force && now.getTime() - lastAnalysisRef.current.getTime() < 15000) {
      console.log('[HealthTopics] Rate limiting analysis - too frequent (waiting 15s)');
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

      console.log('🔍 Invoking analyze-health-topics edge function...', {
        conversation_id: conversationId,
        patient_id: patientId,
        conversation_length: conversationContext.length,
        conversation_type: conversationType,
        user_tier: subscription_tier || 'free',
        force
      });

      // Retry logic with exponential backoff
      let retryCount = 0;
      const maxRetries = 3;
      let data, error;

      while (retryCount <= maxRetries) {
        try {
          const result = await supabase.functions.invoke('analyze-health-topics', {
            body: {
              conversation_id: conversationId,
              patient_id: patientId,
              conversation_context: conversationContext,
              conversation_type: conversationType,
              user_tier: subscription_tier || 'free',
              selected_anatomy: selectedAnatomy,
              include_solutions: includeSolutions,
              retry_attempt: retryCount
            }
          });

          data = result.data;
          error = result.error;

          // If successful or non-retryable error, break
          if (!error || !error.message?.includes('rate limit') && !error.message?.includes('timeout')) {
            break;
          }

          retryCount++;
          if (retryCount <= maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`[HealthTopics] Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (retryError) {
          error = retryError;
          retryCount++;
          if (retryCount <= maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`[HealthTopics] Network error, retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      if (error) {
        console.error('❌ Error from analyze-health-topics edge function:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Try to show a user-friendly error
        throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        console.error('❌ No data returned from analyze-health-topics');
        throw new Error('Analysis returned no data');
      }

      console.log('✅ Health topics analysis response:', {
        topics: data.topics?.length || 0,
        solutions: data.solutions?.length || 0,
        cached: data.cached,
        hasError: !!data.error
      });

      if (data.error) {
        console.error('❌ Analysis returned error:', data.error);
        throw new Error(`Analysis error: ${data.error}`);
      }

      if (data?.topics) {
        console.log(`Generated ${data.topics.length} topics${data.solutions ? ` and ${data.solutions.length} solutions` : ''}`);
        
        // Ensure topics are sorted by confidence (should already be from backend)
        const sortedTopics = [...data.topics].sort((a, b) => b.confidence - a.confidence);
        setTopics(sortedTopics);
        
        if (includeSolutions && data.solutions) {
          const sortedSolutions = [...data.solutions].sort((a, b) => b.confidence - a.confidence);
          
          // Fetch product suggestions for high-confidence solutions
          const solutionsWithProducts = await Promise.all(
            sortedSolutions.map(async (solution) => {
              if (solution.confidence >= 0.4) {
                try {
                  const { data: productData } = await supabase.functions.invoke('amazon-product-search', {
                    body: {
                      solutionCategory: solution.category,
                      keywords: solution.solution.split(' ').slice(0, 3),
                      maxResults: 3
                    }
                  });
                  
                  return {
                    ...solution,
                    products: productData?.products || []
                  };
                } catch (error) {
                  console.error('Error fetching products for solution:', error);
                  return solution;
                }
              }
              return solution;
            })
          );
          
          setSolutions(solutionsWithProducts);
        }
        setLastAnalyzedHash(contentHash);
      }
    } catch (error) {
      console.error('Error in health topics analysis:', error);
      
      // Fallback: Generate basic keyword-based topics if OpenAI fails
      if (conversationContext.length > 50) {
        console.log('🔄 Attempting fallback keyword analysis...');
        const fallbackTopics = generateFallbackTopics(conversationContext);
        if (fallbackTopics.length > 0) {
          setTopics(fallbackTopics);
          console.log(`✅ Generated ${fallbackTopics.length} fallback topics`);
        }
      }
      
      throw error; // Re-throw to let caller handle UI feedback
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

  // Simple fallback topic generation
  const generateFallbackTopics = (context: string): HealthTopic[] => {
    const keywords = ['pain', 'headache', 'fever', 'nausea', 'fatigue', 'cough', 'rash', 'anxiety', 'sleep', 'appetite'];
    const topics: HealthTopic[] = [];
    
    keywords.forEach(keyword => {
      if (context.toLowerCase().includes(keyword)) {
        topics.push({
          topic: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} concerns`,
          confidence: 0.3,
          reasoning: `Keyword "${keyword}" mentioned in conversation - basic analysis available`,
          category: 'general'
        });
      }
    });
    
    return topics.slice(0, 3);
  };

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
          category: 'other', // Default category - database doesn't have this field yet
          updated_at: t.updated_at
        }))
        .sort((a, b) => b.confidence - a.confidence); // Ensure confidence-based sorting
        
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
          const sortedSolutions = existingSolutions.sort((a, b) => b.confidence - a.confidence);
          setSolutions(sortedSolutions);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }, [conversationId, user?.id, patientId, includeSolutions]);

  // Backup analysis trigger if unified system fails  
  useEffect(() => {
    if (!conversationContext || conversationContext.length < minContextLength) return;
    
    // Only trigger backup analysis if no topics exist and we have sufficient context
    const debouncedAnalyze = setTimeout(() => {
      if (topics.length === 0 && !loading) {
        console.log('🔍 HealthTopics: Auto-triggering analysis as backup (no topics found)');
        analyzeHealthTopics();
      }
    }, 5000);

    return () => clearTimeout(debouncedAnalyze);
  }, [conversationContext, analyzeHealthTopics, topics.length, loading, minContextLength]);

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

  // Force refresh function with better logging
  const refreshAnalysis = useCallback(() => {
    console.log('🔄 HealthTopics: Manual refresh triggered');
    setLoading(true);
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