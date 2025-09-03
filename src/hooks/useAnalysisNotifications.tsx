import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisResult } from '@/components/ChatAnalysisNotification';

export interface AnalysisCallbacks {
  onDiagnosisAnalysis: (conversationId: string, patientId: string, recentMessages: any[]) => Promise<AnalysisResult>;
  onSolutionAnalysis: (conversationId: string, patientId: string, recentMessages: any[]) => Promise<AnalysisResult>;
  onMemoryAnalysis: (conversationId: string, patientId: string) => Promise<AnalysisResult>;
}

export const useAnalysisNotifications = (conversationId: string | null, patientId: string | null) => {
  const [pendingAnalysis, setPendingAnalysis] = useState<AnalysisResult[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    messageId: string;
    results: AnalysisResult[];
    timestamp: Date;
  }>>([]);

  // Real-time subscriptions for immediate feedback
  useEffect(() => {
    if (!conversationId || !patientId) return;

    console.log('[AnalysisNotifications] Setting up real-time subscriptions for:', { conversationId, patientId });

    const diagnosisChannel = supabase
      .channel('diagnosis-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisNotifications] New diagnosis added:', payload.new);
          // Update pending analysis to show success
          setPendingAnalysis(prev => prev.map(result => 
            result.type === 'diagnosis' && result.status === 'loading'
              ? { ...result, status: 'success' as const, data: { added: 1, items: [{ text: payload.new.diagnosis, confidence: payload.new.confidence }] } }
              : result
          ));
        }
      )
      .subscribe();

    const solutionsChannel = supabase
      .channel('solutions-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_solutions',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisNotifications] New solution added:', payload.new);
          setPendingAnalysis(prev => prev.map(result => 
            result.type === 'solution' && result.status === 'loading'
              ? { ...result, status: 'success' as const, data: { added: 1, items: [{ text: payload.new.solution, confidence: payload.new.confidence, category: payload.new.category }] } }
              : result
          ));
        }
      )
      .subscribe();

    const memoryChannel = supabase
      .channel('memory-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_memory',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[AnalysisNotifications] Memory updated:', payload.new);
          setPendingAnalysis(prev => prev.map(result => 
            result.type === 'memory' && result.status === 'loading'
              ? { ...result, status: 'success' as const, data: { updated: 1 } }
              : result
          ));
        }
      )
      .subscribe();

    return () => {
      console.log('[AnalysisNotifications] Cleaning up subscriptions');
      supabase.removeChannel(diagnosisChannel);
      supabase.removeChannel(solutionsChannel);
      supabase.removeChannel(memoryChannel);
    };
  }, [conversationId, patientId]);

  const startAnalysis = useCallback((messageId: string) => {
    console.log('[AnalysisNotifications] Starting analysis for message:', messageId);
    
    const initialResults: AnalysisResult[] = [
      { type: 'diagnosis', status: 'loading' },
      { type: 'solution', status: 'loading' },
      { type: 'memory', status: 'loading' }
    ];

    setPendingAnalysis(initialResults);
    
    return {
      updateResult: (type: AnalysisResult['type'], update: Partial<AnalysisResult>) => {
        console.log('[AnalysisNotifications] Updating result:', type, update);
        setPendingAnalysis(prev => prev.map(result => 
          result.type === type ? { ...result, ...update } : result
        ));
      },
      completeAnalysis: () => {
        console.log('[AnalysisNotifications] Analysis complete for message:', messageId);
        setAnalysisHistory(prev => [...prev, {
          messageId,
          results: pendingAnalysis,
          timestamp: new Date()
        }]);
        // Keep results visible for a moment before clearing
        setTimeout(() => setPendingAnalysis([]), 8000);
      }
    };
  }, [pendingAnalysis]);

  const performDiagnosisAnalysis = useCallback(async (
    conversationId: string,
    patientId: string,
    recentMessages: any[]
  ): Promise<AnalysisResult> => {
    console.log('[AnalysisNotifications] Starting diagnosis analysis');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation-diagnosis', {
        body: {
          conversation_id: conversationId,
          patient_id: patientId,
          recent_messages: recentMessages
        }
      });

      if (error) throw error;

      console.log('[AnalysisNotifications] Diagnosis analysis result:', data);
      
      return {
        type: 'diagnosis',
        status: 'success',
        data: {
          added: data?.updated_count || 0,
          updated: data?.updated_count || 0,
          items: data?.diagnoses || []
        }
      };
    } catch (error) {
      console.error('[AnalysisNotifications] Diagnosis analysis failed:', error);
      return {
        type: 'diagnosis',
        status: 'error',
        error: error.message || 'Analysis failed'
      };
    }
  }, []);

  const performSolutionAnalysis = useCallback(async (
    conversationId: string,
    patientId: string,
    recentMessages: any[]
  ): Promise<AnalysisResult> => {
    console.log('[AnalysisNotifications] Starting solution analysis');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation-solutions', {
        body: {
          conversation_id: conversationId,
          patient_id: patientId,
          recent_messages: recentMessages
        }
      });

      if (error) throw error;

      console.log('[AnalysisNotifications] Solution analysis result:', data);
      
      return {
        type: 'solution',
        status: 'success',
        data: {
          added: data?.count || 0,
          updated: data?.count || 0,
          items: data?.solutions || []
        }
      };
    } catch (error) {
      console.error('[AnalysisNotifications] Solution analysis failed:', error);
      return {
        type: 'solution',
        status: 'error',
        error: error.message || 'Analysis failed'
      };
    }
  }, []);

  const performMemoryAnalysis = useCallback(async (
    conversationId: string,
    patientId: string
  ): Promise<AnalysisResult> => {
    console.log('[AnalysisNotifications] Starting memory analysis');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversation-memory', {
        body: {
          conversation_id: conversationId,
          patient_id: patientId
        }
      });

      if (error) throw error;

      console.log('[AnalysisNotifications] Memory analysis result:', data);
      
      return {
        type: 'memory',
        status: 'success',
        data: {
          updated: data?.memoryUpdated ? 1 : 0
        }
      };
    } catch (error) {
      console.error('[AnalysisNotifications] Memory analysis failed:', error);
      return {
        type: 'memory',
        status: 'error',
        error: error.message || 'Analysis failed'
      };
    }
  }, []);

  const clearPendingAnalysis = useCallback(() => {
    setPendingAnalysis([]);
  }, []);

  return {
    pendingAnalysis,
    analysisHistory,
    startAnalysis,
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis,
    clearPendingAnalysis
  };
};
