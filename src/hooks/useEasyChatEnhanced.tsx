import { useCallback, useState } from 'react';
import { useEasyChat } from './useEasyChat';
import { supabase } from '@/integrations/supabase/client';

export const useEasyChatEnhanced = (patientId?: string, selectedAnatomy?: string[]) => {
  const [healthTopics, setHealthTopics] = useState<any[]>([]);

  const easyChatHook = useEasyChat(patientId, selectedAnatomy);

  const completeCurrentSession = useCallback(async () => {
    if (!easyChatHook.currentSession) return;

    try {
      const conversationContext = easyChatHook.conversationPath.map(step => 
        `Q: ${step.question?.question_text || 'Unknown question'} A: ${step.response}`
      ).join('\n');

      // Check if we should complete the session based on AI evaluation
      if (easyChatHook.conversationPath.length >= 3) {
        const shouldComplete = await easyChatHook.checkIfReadyToComplete?.(easyChatHook.conversationPath);
        if (!shouldComplete && easyChatHook.conversationPath.length < 10) {
          console.log('AI suggests continuing the conversation for better health topics');
          return; // Don't complete yet, let the conversation continue
        }
      }

      // Generate final summary and complete session
      await easyChatHook.completeSession(easyChatHook.conversationPath);

      // Generate health topics analysis
      if (conversationContext) {
        const { data: topicsData, error: topicsError } = await supabase.functions.invoke('analyze-easy-chat-topics', {
          body: { 
            conversation_context: conversationContext,
            patient_id: patientId || '',
            conversation_type: 'easy_chat'
          }
        });

        if (!topicsError && topicsData?.topics) {
          setHealthTopics(topicsData.topics);
        }
      }
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [easyChatHook, patientId]);

  return {
    ...easyChatHook,
    completeCurrentSession,
    healthTopics
  };
};