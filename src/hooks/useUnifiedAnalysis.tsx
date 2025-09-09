import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { useAnalysisNotifications } from './useAnalysisNotifications';
import { useConversationMemory } from './useConversationMemory';
import { useStrategicReferencing } from './useStrategicReferencing';

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
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    performDiagnosisAnalysis,
    performSolutionAnalysis,  
    performMemoryAnalysis
  } = useAnalysisNotifications(conversationId, patientId);

  // Update message count and calculate next analysis
  const updateMessageCount = useCallback((newCount: number) => {
    setAnalysisState(prev => ({
      ...prev,
      messageCount: newCount,
      messagesUntilAnalysis: REGULAR_INTERVAL - (newCount % REGULAR_INTERVAL),
      messagesUntilDeepAnalysis: DEEP_INTERVAL - (newCount % DEEP_INTERVAL)
    }));
  }, []);

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

  // Perform unified analysis
  const performAnalysis = useCallback(async (
    messages: any[], 
    analysisType: 'regular' | 'deep',
    isManual: boolean = false
  ): Promise<void> => {
    if (!conversationId || !patientId || !user) return;

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
      onAnalysisComplete?.(analysisResults);

    } catch (error) {
      console.error(`[UnifiedAnalysis] Error in ${analysisType} analysis:`, error);
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
  }, [
    conversationId,
    patientId, 
    user,
    animateDeepAnalysisStages,
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis,
    getStrategicContext,
    memories,
    insights,
    subscription_tier,
    onAnalysisComplete
  ]);

  // Check and trigger scheduled analysis
  const checkScheduledAnalysis = useCallback(async (messages: any[]) => {
    if (analysisState.isAnalyzing || !conversationId || !patientId) return;

    const { messageCount } = analysisState;
    const shouldAnalyzeRegular = messageCount % REGULAR_INTERVAL === 0;
    const shouldAnalyzeDeep = messageCount % DEEP_INTERVAL === 0;

    if (shouldAnalyzeDeep) {
      await performAnalysis(messages, 'deep', false);
    } else if (shouldAnalyzeRegular) {
      await performAnalysis(messages, 'regular', false);
    }
  }, [analysisState, conversationId, patientId, performAnalysis]);

  // Manual analysis - intelligently choose type
  const triggerManualAnalysis = useCallback(async (messages: any[]) => {
    if (analysisState.isAnalyzing) return;

    // Determine analysis type based on when last deep analysis occurred
    const messagesSinceLastDeep = analysisState.messageCount % DEEP_INTERVAL;
    const analysisType = messagesSinceLastDeep < 8 ? 'regular' : 'deep';
    
    await performAnalysis(messages, analysisType, true);
  }, [analysisState, performAnalysis]);

  // Cleanup timeouts
  const cleanup = useCallback(() => {
    if (stageTimeoutRef.current) {
      clearTimeout(stageTimeoutRef.current);
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
  }, []);

  return {
    analysisState,
    updateMessageCount,
    checkScheduledAnalysis,
    triggerManualAnalysis,
    cleanup
  };
};