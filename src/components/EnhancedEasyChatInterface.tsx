import { useState, useEffect } from 'react';
import { AnatomySelector } from './AnatomySelector';
import { EasyChatInterface } from './EasyChatInterface';
import { EasyChatCompletionModal } from './EasyChatCompletionModal';
import { useEasyChatEnhanced } from '@/hooks/useEasyChatEnhanced';

type ChatPhase = 'anatomy-selection' | 'chat' | 'completed';

interface EnhancedEasyChatInterfaceProps {
  patientId?: string;
}

export const EnhancedEasyChatInterface = ({ patientId }: EnhancedEasyChatInterfaceProps) => {
  const [phase, setPhase] = useState<ChatPhase>('anatomy-selection');
  const [selectedAnatomy, setSelectedAnatomy] = useState<string[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const {
    currentQuestion,
    currentSession,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    getResponseOptions,
    isCompleted,
    hasActiveSession,
    hasResponses,
    completeCurrentSession,
    healthTopics
  } = useEasyChatEnhanced(patientId, selectedAnatomy);

  const handleAnatomySelection = (anatomy: string[]) => {
    setSelectedAnatomy(anatomy);
    setPhase('chat');
    // Start new session with anatomy context
    startNewSession();
  };

  const handleFinishChat = () => {
    completeCurrentSession();
    setShowCompletionModal(true);
  };

  const handleStartNewChat = () => {
    setPhase('anatomy-selection');
    setSelectedAnatomy([]);
    setShowCompletionModal(false);
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
        <EasyChatInterface
          patientId={patientId}
          selectedAnatomy={selectedAnatomy}
          onFinish={handleFinishChat}
            useEasyChatHook={{
              currentQuestion,
              currentSession,
              conversationPath,
              loading,
              startNewSession,
              submitResponse,
              getResponseOptions,
              isCompleted,
              hasActiveSession,
              hasResponses,
              responses: []
            }}
        />
        
        <EasyChatCompletionModal
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