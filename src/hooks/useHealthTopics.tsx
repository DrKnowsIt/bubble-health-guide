import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface HealthTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
}

interface UseHealthTopicsProps {
  conversationId?: string;
  patientId?: string;
  messages: Array<{ type: 'user' | 'ai'; content: string }>;
  minMessages?: number;
}

export const useHealthTopics = ({ 
  conversationId, 
  patientId, 
  messages, 
  minMessages = 2 
}: UseHealthTopicsProps) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<HealthTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0);

  const generateTopics = async () => {
    if (!conversationId || !patientId || !user || messages.length < minMessages) {
      return;
    }

    // Don't re-analyze if we haven't added enough new messages
    if (messages.length - lastAnalyzedCount < 2) {
      return;
    }

    try {
      setLoading(true);
      console.log('[HealthTopics] Generating topics for conversation:', conversationId);

      // Create conversation context for the API
      const conversationContext = messages
        .map(msg => `${msg.type === 'user' ? 'Patient' : 'AI'}: ${msg.content}`)
        .join('\n');

      const { data, error } = await supabase.functions.invoke('analyze-easy-chat-topics', {
        body: {
          conversation_context: conversationContext,
          patient_id: patientId,
          conversation_type: 'pro_chat'
        }
      });

      if (error) {
        console.error('[HealthTopics] Error generating topics:', error);
        return;
      }

      if (data?.topics && Array.isArray(data.topics)) {
        console.log('[HealthTopics] Topics generated successfully:', data.topics);
        setTopics(data.topics);
        setLastAnalyzedCount(messages.length);
      }
    } catch (error) {
      console.error('[HealthTopics] Error in generateTopics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate topics when messages change
  useEffect(() => {
    if (messages.length >= minMessages && messages.length !== lastAnalyzedCount) {
      generateTopics();
    }
  }, [messages.length, conversationId, patientId]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return "bg-emerald-500/20 text-emerald-400 border-emerald-700";
    if (confidence >= 0.5) return "bg-amber-500/20 text-amber-400 border-amber-700";
    return "bg-slate-500/20 text-slate-400 border-slate-700";
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'symptoms': return '🩺';
      case 'conditions': return '🏥';
      case 'lifestyle': return '🏃‍♂️';
      case 'mental_health': return '🧠';
      case 'prevention': return '🛡️';
      default: return '💬';
    }
  };

  return {
    topics,
    loading,
    generateTopics,
    getConfidenceColor,
    getCategoryIcon
  };
};