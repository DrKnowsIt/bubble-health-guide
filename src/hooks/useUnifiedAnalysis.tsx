import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAnalysisNotifications } from './useAnalysisNotifications';
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
  const { 
    canRunAnalysis, 
    queueAnalysis, 
    completeAnalysis, 
    cancelAnalysesForConversation,
    getQueueStatus 
  } = useAnalysisThrottling();

  // Analysis configuration - Natural conversation flow
  const REGULAR_INTERVAL = 2; // Auto-analysis every 2 AI responses
  const DEEP_INTERVAL = 0; // Disabled automatic deep analysis
  
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    analysisType: null,
    currentStage: "",
    messageCount: 0,
    messagesUntilAnalysis: REGULAR_INTERVAL,
    messagesUntilDeepAnalysis: DEEP_INTERVAL
  });

  const stageTimeoutRef = useRef<NodeJS.Timeout>();

  // Update AI message count and calculate remaining messages until analysis
  const updateMessageCount = useCallback((aiMessageCount: number) => {
    setAnalysisState(prev => ({
      ...prev,
      messageCount: aiMessageCount,
      messagesUntilAnalysis: REGULAR_INTERVAL > 0 ? REGULAR_INTERVAL - (aiMessageCount % REGULAR_INTERVAL) : 0,
      messagesUntilDeepAnalysis: DEEP_INTERVAL > 0 ? DEEP_INTERVAL - (aiMessageCount % DEEP_INTERVAL) : 0
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

    console.log(`[UnifiedAnalysis] Attempting ${analysisType} analysis (${isManual ? 'manual' : 'automatic'})`);

    // Check if analysis can run (with manual bypass)
    const { allowed, reason, waitTime } = canRunAnalysis(conversationId, analysisType, isManual);
    if (!allowed && !isManual) {
      console.log(`[UnifiedAnalysis] Analysis throttled: ${reason} (wait: ${waitTime}ms)`);
      return;
    }

    // For manual analysis that's throttled, queue it with high priority
    if (!allowed && isManual) {
      console.log(`[UnifiedAnalysis] Manual analysis throttled, queuing with high priority: ${reason}`);
      queueAnalysis(conversationId, analysisType, true);
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
        // Regular/shallow analysis - runs automatically every 2 AI responses
        // Analyzes current conversation and updates health topics + solutions
        console.log('[UnifiedAnalysis] Running shallow analysis with diagnosis and solution extraction');
        analysisPromises.push(
          performDiagnosisAnalysis(conversationId, patientId, messages),
          performSolutionAnalysis(conversationId, patientId, messages)
        );
      } else {
        // Deep analysis - comprehensive analysis using ALL patient data
        // Fetches: health records, conversation memories, previous diagnoses, 
        // solutions, insights, easy chat sessions, comprehensive reports
        console.log('[UnifiedAnalysis] Running DEEP analysis with comprehensive data fetching');
        
        // Call the comprehensive final medical analysis function
        // This fetches ALL patient data and generates thorough analysis
        analysisPromises.push(
          supabase.functions.invoke('generate-final-medical-analysis', {
            body: {
              patient_id: patientId,
              user_id: user.id,
              conversation_id: conversationId // Pass conversation_id for UI updates
            }
          }),
          // Also run memory analysis for deep analysis
          performMemoryAnalysis(conversationId, patientId)
        );
      }

      const results = await Promise.allSettled(analysisPromises);
      
      // Process results with detailed error tracking
      const analysisResults = {
        type: analysisType,
        results: results.map((result, index) => {
          if (result.status === 'fulfilled') {
            const data = result.value?.data || result.value;
            const error = result.value?.error;
            
            if (error) {
              console.error(`[UnifiedAnalysis] Analysis ${index} failed:`, error);
              return { error, success: false };
            }
            
            return { data, success: true };
          } else {
            console.error(`[UnifiedAnalysis] Analysis ${index} rejected:`, result.reason);
            return { error: result.reason, success: false };
          }
        }),
        hasErrors: results.some(result => 
          result.status === 'rejected' || 
          (result.status === 'fulfilled' && result.value?.error)
        )
      };

      const success = !analysisResults.hasErrors;
      console.log(`[UnifiedAnalysis] ${analysisType} analysis completed:`, {
        success,
        resultsCount: results.length,
        errors: analysisResults.results.filter(r => !r.success).map(r => r.error)
      });
      
      completeAnalysis(`${conversationId}-${analysisType}`, success);
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
  }, [conversationId, patientId, user, performDiagnosisAnalysis, performSolutionAnalysis, performMemoryAnalysis, onAnalysisComplete, canRunAnalysis, queueAnalysis, completeAnalysis, animateDeepAnalysisStages]);

  // Check for scheduled analysis with throttling - only count AI responses
  const checkScheduledAnalysis = useCallback(async (messages: any[]) => {
    if (!conversationId || !patientId) {
      console.log('🚫 UnifiedAnalysis: Missing conversationId or patientId', { conversationId, patientId });
      return;
    }
    
    // Count only AI responses (messages with role 'assistant')
    const aiMessageCount = messages.filter((msg: any) => msg.role === 'assistant').length;
    console.log('🔍 UnifiedAnalysis: Checking scheduled analysis', { aiMessageCount, totalMessages: messages.length, conversationId });
    
    // Cancel any pending analyses for conversation when new messages come in
    cancelAnalysesForConversation(conversationId);
    
    // Check if analysis is due based on AI message count
    const shouldRunRegularAnalysis = REGULAR_INTERVAL > 0 && aiMessageCount > 0 && aiMessageCount % REGULAR_INTERVAL === 0;
    const shouldRunDeepAnalysis = DEEP_INTERVAL > 0 && aiMessageCount > 0 && aiMessageCount % DEEP_INTERVAL === 0;
    
    console.log('🔍 Analysis intervals check:', { 
      shouldRunRegular: shouldRunRegularAnalysis, 
      shouldRunDeep: shouldRunDeepAnalysis,
      aiMessageCount,
      totalMessageCount: messages.length,
      regularInterval: REGULAR_INTERVAL,
      deepInterval: DEEP_INTERVAL
    });
    
    if (shouldRunDeepAnalysis) {
      console.log('🧠 Queueing deep analysis for conversation:', conversationId);
      // Queue deep analysis (higher priority)
      queueAnalysis(conversationId, 'deep', false);
    } else if (shouldRunRegularAnalysis) {
      console.log('🔍 Queueing regular analysis for conversation:', conversationId);
      // Queue regular analysis
      queueAnalysis(conversationId, 'regular', false);
    } else {
      console.log('🚫 No analysis needed at this time', { aiMessageCount, totalMessages: messages.length });
    }
  }, [conversationId, patientId, cancelAnalysesForConversation, queueAnalysis]);

  // Trigger manual analysis with throttling bypass
  const triggerManualAnalysis = useCallback(async (messages: any[]) => {
    if (!conversationId || !patientId) return;
    
    console.log(`[UnifiedAnalysis] Manual analysis triggered for conversation ${conversationId}`);
    
    // Determine analysis type based on message count
    const messageCount = messages.length;
    const analysisType = messageCount >= DEEP_INTERVAL ? 'deep' : 'regular';
    
    console.log(`[UnifiedAnalysis] Selected ${analysisType} analysis (${messageCount} messages)`);
    
    // For manual analysis, try to run immediately or queue with high priority
    try {
      await performAnalysis(messages, analysisType, true);
    } catch (error) {
      console.error(`[UnifiedAnalysis] Manual analysis failed:`, error);
      // Fallback: queue it
      queueAnalysis(conversationId, analysisType, true);
    }
  }, [conversationId, patientId, performAnalysis, queueAnalysis]);

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