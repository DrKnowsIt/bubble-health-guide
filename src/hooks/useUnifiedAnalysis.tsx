import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { useAnalysisNotifications } from './useAnalysisNotifications';
import { useConversationMemory } from './useConversationMemory';
import { useStrategicReferencing } from './useStrategicReferencing';
import { useAnalysisThrottling } from './useAnalysisThrottling';

export interface UnifiedAnalysisOptions {
  conversationId: string | null;
  patientId: string | null;
  onAnalysisComplete?: (results: any) => void;
}

export interface AnalysisState {
  isAnalyzing: boolean;
  analysisType: 'regular' | 'deep' | null;
  currentStage: string;
  messageCount: number;
  messagesUntilAnalysis: number;
  messagesUntilDeepAnalysis: number;
  queueStatus?: {
    activeCount: number;
    queuedCount: number;
    maxConcurrent: number;
  };
}

// Deep analysis rotating stages
const DEEP_ANALYSIS_STAGES = [
  "DrKnowsIt Analyzing Data",
  "Checking Symptoms", 
  "Relating Data",
  "Reviewing Patterns",
  "Finalizing Insights"
];

export const useUnifiedAnalysis = ({ conversationId, patientId, onAnalysisComplete }: UnifiedAnalysisOptions) => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  const { memories, insights } = useConversationMemory(patientId || undefined);
  const { getStrategicContext } = useStrategicReferencing(patientId);
  const { 
    canRunAnalysis, 
    queueAnalysis, 
    completeAnalysis, 
    cancelAnalysesForConversation,
    getQueueStatus 
  } = useAnalysisThrottling();

  // Analysis configuration
  const REGULAR_INTERVAL = 4; // Regular analysis every 4 messages
  const DEEP_INTERVAL = 16; // Deep analysis every 16 messages
  
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    analysisType: null,
    currentStage: "",
    messageCount: 0,
    messagesUntilAnalysis: REGULAR_INTERVAL,
    messagesUntilDeepAnalysis: DEEP_INTERVAL
  });

  const stageTimeoutRef = useRef<NodeJS.Timeout>();

  // Update message count and calculate remaining messages
  const updateMessageCount = useCallback((newCount: number) => {
    setAnalysisState(prev => ({
      ...prev,
      messageCount: newCount,
      messagesUntilAnalysis: REGULAR_INTERVAL - (newCount % REGULAR_INTERVAL),
      messagesUntilDeepAnalysis: DEEP_INTERVAL - (newCount % DEEP_INTERVAL)
    }));
  }, []);

  // Analysis notifications
  const {
    startAnalysis,
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis
  } = useAnalysisNotifications(conversationId, patientId);

  // Animate through deep analysis stages
  const animateDeepAnalysisStages = useCallback(() => {
    let currentStageIndex = 0;
    
    const updateStage = () => {
      if (currentStageIndex < DEEP_ANALYSIS_STAGES.length) {
        setAnalysisState(prev => ({
          ...prev,
          currentStage: DEEP_ANALYSIS_STAGES[currentStageIndex]
        }));
        currentStageIndex++;
        stageTimeoutRef.current = setTimeout(updateStage, 2500); // 2.5 seconds per stage
      }
    };
    
    updateStage();
  }, []);

  // Perform unified analysis with throttling
  const performAnalysis = useCallback(async (
    messages: any[], 
    analysisType: 'regular' | 'deep',
    isManual: boolean = false
  ): Promise<void> => {
    if (!conversationId || !patientId || !user) return;

    // Check if analysis can run
    const { allowed, reason, waitTime } = canRunAnalysis(conversationId, analysisType);
    if (!allowed) {
      console.log(`[UnifiedAnalysis] Analysis throttled: ${reason} (wait: ${waitTime}ms)`);
      if (isManual) {
        // For manual analysis, queue it
        queueAnalysis(conversationId, analysisType);
      }
      return;
    }

    console.log(`[UnifiedAnalysis] Starting ${analysisType} analysis (${isManual ? 'manual' : 'automatic'})`);
    
    setAnalysisState(prev => ({
      ...prev,
      isAnalyzing: true,
      analysisType,
      currentStage: analysisType === 'deep' ? DEEP_ANALYSIS_STAGES[0] : "Analyzing..."
    }));

    // Start stage animation for deep analysis
    if (analysisType === 'deep') {
      animateDeepAnalysisStages();
    }

    try {
      const analysisPromises: Promise<any>[] = [];
      
      if (analysisType === 'regular') {
        // Regular analysis - basic health topics and solutions
        analysisPromises.push(
          performDiagnosisAnalysis(conversationId, patientId, messages),
          performSolutionAnalysis(conversationId, patientId, messages)
        );
      } else {
        // Deep analysis - comprehensive analysis with memory and strategic context
        const strategicContext = await getStrategicContext();
        const memoryData = {
          memories: memories || [],
          insights: insights || []
        };

        // Enhanced analysis with comprehensive data
        analysisPromises.push(
          supabase.functions.invoke('analyze-health-topics', {
            body: {
              patient_id: patientId,
              conversation_id: conversationId,
              conversation_context: messages.map(m => m.content).join('\n'),
              include_solutions: true,
              enhanced_mode: true,
              memory_data: memoryData,
              strategic_context: strategicContext,
              subscription_tier: subscription_tier || 'basic',
              analysis_type: 'comprehensive'
            }
          }),
          performDiagnosisAnalysis(conversationId, patientId, messages),
          performSolutionAnalysis(conversationId, patientId, messages),
          performMemoryAnalysis(conversationId, patientId)
        );
      }

      const results = await Promise.allSettled(analysisPromises);
      
      // Process results
      const analysisResults = {
        type: analysisType,
        results: results.map(result => 
          result.status === 'fulfilled' ? result.value : { error: result.reason }
        )
      };

      console.log(`[UnifiedAnalysis] ${analysisType} analysis completed:`, analysisResults);
      completeAnalysis(`${conversationId}-${analysisType}`, true);
      onAnalysisComplete?.(analysisResults);

    } catch (error) {
      console.error(`[UnifiedAnalysis] Error in ${analysisType} analysis:`, error);
      completeAnalysis(`${conversationId}-${analysisType}`, false);
    } finally {
      // Clear stage timeout
      if (stageTimeoutRef.current) {
        clearTimeout(stageTimeoutRef.current);
      }
      
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisType: null,
        currentStage: ""
      }));
    }
  }, [conversationId, patientId, user, subscription_tier, memories, insights, getStrategicContext, performDiagnosisAnalysis, performSolutionAnalysis, performMemoryAnalysis, onAnalysisComplete, canRunAnalysis, queueAnalysis, completeAnalysis, animateDeepAnalysisStages]);

  // Check for scheduled analysis with throttling
  const checkScheduledAnalysis = useCallback(async (messages: any[]) => {
    if (!conversationId || !patientId) return;
    
    const messageCount = messages.length;
    
    // Cancel any pending analyses for conversation when new messages come in
    cancelAnalysesForConversation(conversationId);
    
    // Check if analysis is due
    const shouldRunRegularAnalysis = messageCount > 0 && messageCount % REGULAR_INTERVAL === 0;
    const shouldRunDeepAnalysis = messageCount > 0 && messageCount % DEEP_INTERVAL === 0;
    
    if (shouldRunDeepAnalysis) {
      // Queue deep analysis (higher priority)
      queueAnalysis(conversationId, 'deep');
    } else if (shouldRunRegularAnalysis) {
      // Queue regular analysis
      queueAnalysis(conversationId, 'regular');
    }
  }, [conversationId, patientId, cancelAnalysesForConversation, queueAnalysis]);

  // Trigger manual analysis with throttling
  const triggerManualAnalysis = useCallback(async (messages: any[]) => {
    if (!conversationId || !patientId) return;
    
    // Determine analysis type based on message count
    const messageCount = messages.length;
    const analysisType = messageCount >= DEEP_INTERVAL ? 'deep' : 'regular';
    
    // Queue manual analysis (with higher priority)
    queueAnalysis(conversationId, analysisType);
  }, [conversationId, patientId, queueAnalysis]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (stageTimeoutRef.current) {
      clearTimeout(stageTimeoutRef.current);
    }
    if (conversationId) {
      cancelAnalysesForConversation(conversationId);
    }
  }, [conversationId, cancelAnalysesForConversation]);

  return {
    analysisState: {
      ...analysisState,
      queueStatus: getQueueStatus()
    },
    updateMessageCount,
    checkScheduledAnalysis,
    triggerManualAnalysis,
    cleanup
  };
};