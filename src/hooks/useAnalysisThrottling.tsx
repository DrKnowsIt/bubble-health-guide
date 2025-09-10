import { useState, useRef, useCallback, useEffect } from 'react';

interface AnalysisRequest {
  id: string;
  conversationId: string;
  type: 'regular' | 'deep' | 'diagnosis' | 'solution' | 'memory';
  timestamp: number;
  priority: number; // Higher = more important
}

interface AnalysisThrottleState {
  activeAnalyses: Map<string, AnalysisRequest>;
  queuedAnalyses: AnalysisRequest[];
  recentAnalyses: Map<string, number>; // conversationId -> timestamp
  analysisAttempts: Map<string, number>; // conversationId -> count
}

export const useAnalysisThrottling = () => {
  const [state, setState] = useState<AnalysisThrottleState>({
    activeAnalyses: new Map(),
    queuedAnalyses: [],
    recentAnalyses: new Map(),
    analysisAttempts: new Map()
  });

  const processingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Configuration
  const MAX_CONCURRENT_ANALYSES = 2;
  const MIN_ANALYSIS_INTERVAL = 30000; // 30 seconds between analyses per conversation
  const MAX_ANALYSES_PER_HOUR = 3; // Per conversation
  const ANALYSIS_ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour

  // Priority levels
  const PRIORITY_LEVELS = {
    deep: 3,
    regular: 2,
    diagnosis: 1,
    solution: 1,
    memory: 1
  };

  const canRunAnalysis = useCallback((conversationId: string, type: string): { allowed: boolean; reason?: string; waitTime?: number } => {
    const now = Date.now();
    
    // Check if conversation has too many recent attempts
    const attempts = state.analysisAttempts.get(conversationId) || 0;
    if (attempts >= MAX_ANALYSES_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Analysis limit reached for this conversation.',
        waitTime: ANALYSIS_ATTEMPT_WINDOW
      };
    }

    // Check minimum interval between analyses for this conversation
    const lastAnalysis = state.recentAnalyses.get(conversationId) || 0;
    const timeSinceLastAnalysis = now - lastAnalysis;
    if (timeSinceLastAnalysis < MIN_ANALYSIS_INTERVAL) {
      return {
        allowed: false,
        reason: 'Analysis too frequent. Please wait.',
        waitTime: MIN_ANALYSIS_INTERVAL - timeSinceLastAnalysis
      };
    }

    // Check if analysis of same type is already running for this conversation
    const existingAnalysis = Array.from(state.activeAnalyses.values())
      .find(analysis => analysis.conversationId === conversationId && analysis.type === type);
    
    if (existingAnalysis) {
      return {
        allowed: false,
        reason: 'Analysis of this type already running.',
        waitTime: 10000
      };
    }

    // Check concurrent analysis limit
    if (state.activeAnalyses.size >= MAX_CONCURRENT_ANALYSES) {
      return {
        allowed: false,
        reason: 'Too many analyses running. Queuing request.',
        waitTime: 5000
      };
    }

    return { allowed: true };
  }, [state]);

  const queueAnalysis = useCallback((
    conversationId: string,
    type: 'regular' | 'deep' | 'diagnosis' | 'solution' | 'memory'
  ): string => {
    const analysisId = `${conversationId}-${type}-${Date.now()}`;
    const request: AnalysisRequest = {
      id: analysisId,
      conversationId,
      type,
      timestamp: Date.now(),
      priority: PRIORITY_LEVELS[type] || 1
    };

    setState(prev => {
      // Check if same analysis is already queued or active
      const isAlreadyQueued = prev.queuedAnalyses.some(
        analysis => analysis.conversationId === conversationId && analysis.type === type
      );
      const isAlreadyActive = Array.from(prev.activeAnalyses.values()).some(
        analysis => analysis.conversationId === conversationId && analysis.type === type
      );

      if (isAlreadyQueued || isAlreadyActive) {
        console.log(`[AnalysisThrottling] Duplicate ${type} analysis request ignored for conversation ${conversationId}`);
        return prev;
      }

      // Sort queue by priority (higher first), then by timestamp
      const newQueue = [...prev.queuedAnalyses, request].sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      console.log(`[AnalysisThrottling] Queued ${type} analysis for conversation ${conversationId}`);
      return {
        ...prev,
        queuedAnalyses: newQueue
      };
    });

    // Try to process queue
    processQueue();
    
    return analysisId;
  }, []);

  const processQueue = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      setState(prev => {
        if (prev.queuedAnalyses.length === 0 || prev.activeAnalyses.size >= MAX_CONCURRENT_ANALYSES) {
          return prev;
        }

        // Find next processable analysis
        let nextAnalysisIndex = -1;
        for (let i = 0; i < prev.queuedAnalyses.length; i++) {
          const analysis = prev.queuedAnalyses[i];
          const { allowed } = canRunAnalysis(analysis.conversationId, analysis.type);
          if (allowed) {
            nextAnalysisIndex = i;
            break;
          }
        }

        if (nextAnalysisIndex === -1) {
          // Try again later
          processingTimeoutRef.current = setTimeout(processQueue, 5000);
          return prev;
        }

        // Move analysis from queue to active
        const nextAnalysis = prev.queuedAnalyses[nextAnalysisIndex];
        const newQueue = prev.queuedAnalyses.filter((_, index) => index !== nextAnalysisIndex);
        const newActive = new Map(prev.activeAnalyses);
        newActive.set(nextAnalysis.id, nextAnalysis);

        // Update recent analyses and attempts
        const newRecentAnalyses = new Map(prev.recentAnalyses);
        newRecentAnalyses.set(nextAnalysis.conversationId, Date.now());

        const newAttempts = new Map(prev.analysisAttempts);
        const currentAttempts = newAttempts.get(nextAnalysis.conversationId) || 0;
        newAttempts.set(nextAnalysis.conversationId, currentAttempts + 1);

        console.log(`[AnalysisThrottling] Started ${nextAnalysis.type} analysis for conversation ${nextAnalysis.conversationId}`);

        // Continue processing queue
        if (newQueue.length > 0) {
          processingTimeoutRef.current = setTimeout(processQueue, 1000);
        }

        return {
          ...prev,
          queuedAnalyses: newQueue,
          activeAnalyses: newActive,
          recentAnalyses: newRecentAnalyses,
          analysisAttempts: newAttempts
        };
      });
    }, 100);
  }, [canRunAnalysis]);

  const completeAnalysis = useCallback((analysisId: string, success: boolean) => {
    setState(prev => {
      const newActive = new Map(prev.activeAnalyses);
      const analysis = newActive.get(analysisId);
      newActive.delete(analysisId);

      if (analysis) {
        console.log(`[AnalysisThrottling] Completed ${analysis.type} analysis for conversation ${analysis.conversationId} - ${success ? 'success' : 'failed'}`);
        
        // If failed, reduce attempts count to allow retry sooner
        if (!success) {
          const newAttempts = new Map(prev.analysisAttempts);
          const currentAttempts = newAttempts.get(analysis.conversationId) || 0;
          newAttempts.set(analysis.conversationId, Math.max(0, currentAttempts - 1));
          
          return {
            ...prev,
            activeAnalyses: newActive,
            analysisAttempts: newAttempts
          };
        }
      }

      return {
        ...prev,
        activeAnalyses: newActive
      };
    });

    // Process queue after completion
    processQueue();
  }, [processQueue]);

  const cancelAnalysesForConversation = useCallback((conversationId: string) => {
    setState(prev => {
      const newQueue = prev.queuedAnalyses.filter(analysis => analysis.conversationId !== conversationId);
      const newActive = new Map(prev.activeAnalyses);
      
      // Cancel active analyses for this conversation
      const cancelledAnalyses: string[] = [];
      for (const [id, analysis] of newActive.entries()) {
        if (analysis.conversationId === conversationId) {
          newActive.delete(id);
          cancelledAnalyses.push(id);
        }
      }

      if (cancelledAnalyses.length > 0 || newQueue.length !== prev.queuedAnalyses.length) {
        console.log(`[AnalysisThrottling] Cancelled analyses for conversation ${conversationId}`);
      }

      return {
        ...prev,
        queuedAnalyses: newQueue,
        activeAnalyses: newActive
      };
    });
  }, []);

  // Cleanup old attempts every hour
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        const newAttempts = new Map();
        const newRecentAnalyses = new Map();
        
        // Only keep attempts and analyses within the window
        for (const [conversationId, timestamp] of prev.recentAnalyses.entries()) {
          if (now - timestamp < ANALYSIS_ATTEMPT_WINDOW) {
            newRecentAnalyses.set(conversationId, timestamp);
          }
        }
        
        // Reset attempt counts for conversations not analyzed recently
        for (const [conversationId, count] of prev.analysisAttempts.entries()) {
          if (newRecentAnalyses.has(conversationId)) {
            newAttempts.set(conversationId, count);
          }
        }
        
        return {
          ...prev,
          recentAnalyses: newRecentAnalyses,
          analysisAttempts: newAttempts
        };
      });
    }, 60000); // Every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    canRunAnalysis,
    queueAnalysis,
    completeAnalysis,
    cancelAnalysesForConversation,
    getQueueStatus: () => ({
      activeCount: state.activeAnalyses.size,
      queuedCount: state.queuedAnalyses.length,
      maxConcurrent: MAX_CONCURRENT_ANALYSES
    }),
    getConversationStatus: (conversationId: string) => ({
      lastAnalysisTime: state.recentAnalyses.get(conversationId) || 0,
      analysisAttempts: state.analysisAttempts.get(conversationId) || 0,
      maxAttemptsPerHour: MAX_ANALYSES_PER_HOUR
    })
  };
};
