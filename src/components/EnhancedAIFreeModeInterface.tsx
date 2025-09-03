
import { useState, useEffect, useCallback } from 'react';
import { AnatomySelector } from './AnatomySelector';
import { AIFreeModeInterface } from './AIFreeModeInterface';
import { AIFreeModeCompletionModal } from './AIFreeModeCompletionModal';
import { useAIFreeModeEnhanced } from '@/hooks/useAIFreeModeEnhanced';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

type ChatPhase = 'anatomy-selection' | 'chat' | 'completed';

interface EnhancedAIFreeModeInterfaceProps {
  patientId?: string;
}

export const EnhancedAIFreeModeInterface = ({ patientId }: EnhancedAIFreeModeInterfaceProps) => {
  const [phase, setPhase] = useState<ChatPhase>('anatomy-selection');
  const [selectedAnatomy, setSelectedAnatomy] = useState<string[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionRecovered, setSessionRecovered] = useState(false);

  // Session persistence - use stable session ID that doesn't change on refresh
  const sessionId = `enhanced_${patientId || 'default'}_aifreechat`;
  const { saveSessionData, loadSessionData, clearSessionData } = useSessionPersistence(sessionId);

  const {
    currentQuestion,
    currentSession,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    submitTextResponse,
    getResponseOptions,
    isCompleted,
    hasActiveSession,
    hasResponses,
    completeCurrentSession,
    healthTopics
  } = useAIFreeModeEnhanced(patientId, selectedAnatomy);

  // Save session data whenever important state changes
  const saveCurrentState = useCallback(() => {
    saveSessionData({
      phase,
      selectedAnatomy,
      conversationPath,
      healthTopics: healthTopics || [],
      sessionComplete: showCompletionModal,
      timestamp: Date.now()
    });
  }, [phase, selectedAnatomy, conversationPath, healthTopics, showCompletionModal, saveSessionData]);

  // Load session data on mount
  useEffect(() => {
    const savedData = loadSessionData();
    if (savedData && !sessionRecovered) {
      console.log('Loading saved session data:', savedData);
      
      if (savedData.phase) {
        setPhase(savedData.phase as ChatPhase);
        
        if (savedData.selectedAnatomy) {
          setSelectedAnatomy(savedData.selectedAnatomy);
        }
        
        if (savedData.sessionComplete) {
          setShowCompletionModal(true);
        }
        
        setSessionRecovered(true);
        console.log('Session state restored from localStorage');
      }
    }
  }, [loadSessionData, sessionRecovered]);

  // Save state changes
  useEffect(() => {
    if (sessionRecovered || phase !== 'anatomy-selection') {
      saveCurrentState();
    }
  }, [phase, selectedAnatomy, conversationPath, saveCurrentState, sessionRecovered]);

  const handleAnatomySelection = (anatomy: string[]) => {
    setSelectedAnatomy(anatomy);
    setPhase('chat');
    // Always force new session when coming from anatomy selection - this ensures fresh start
    console.log('Starting fresh AI Free Mode session from anatomy selection');
    startNewSession(true);
  };

  const handleFinishChat = () => {
    completeCurrentSession();
    setShowCompletionModal(true);
  };

  const handleStartNewChat = () => {
    console.log('Starting completely new chat - clearing saved data');
    clearSessionData();
    setPhase('anatomy-selection');
    setSelectedAnatomy([]);
    setShowCompletionModal(false);
    setSessionRecovered(false);
  };

  const handleRestartAnalysis = () => {
    console.log('Restarting analysis - clearing saved data');
    clearSessionData();
    setPhase('anatomy-selection');
    setSelectedAnatomy([]);
    setShowCompletionModal(false);
    setSessionRecovered(false);
  };

  const sessionData = {
    selectedAnatomy,
    conversationPath,
    healthTopics: healthTopics || [],
    finalSummary: currentSession?.final_summary
  };

  // Handle completed session
  useEffect(() => {
    if (isCompleted && phase === 'chat') {
      setShowCompletionModal(true);
    }
  }, [isCompleted, phase]);

  // Session recovery - restore active sessions on page refresh
  useEffect(() => {
    if (hasActiveSession && currentSession && !sessionRecovered && phase === 'anatomy-selection') {
      console.log('Recovering active session from page refresh');
      
      // Extract selected anatomy from session data
      const sessionData = currentSession.session_data as any;
      if (sessionData?.selected_anatomy) {
        setSelectedAnatomy(sessionData.selected_anatomy);
        setPhase('chat');
        setSessionRecovered(true);
        console.log('Session recovered with anatomy:', sessionData.selected_anatomy);
      }
    }
  }, [hasActiveSession, currentSession, sessionRecovered, phase]);

  if (phase === 'anatomy-selection') {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <AnatomySelector onSelectionComplete={handleAnatomySelection} />
      </div>
    );
  }

  if (phase === 'chat') {
    return (
      <>
        <AIFreeModeInterface
          patientId={patientId}
          selectedAnatomy={selectedAnatomy}
          onFinish={handleFinishChat}
          onRestart={handleRestartAnalysis}
          useAIFreeModeHook={{
            currentQuestion,
            currentSession,
            conversationPath,
            loading,
            startNewSession,
            submitResponse,
            submitTextResponse,
            getResponseOptions,
            isCompleted,
            hasActiveSession,
            hasResponses,
            healthTopics
          }}
        />
        
        <AIFreeModeCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onStartNewChat={handleStartNewChat}
          sessionData={sessionData}
        />
      </>
    );
  }

  return null;
};
