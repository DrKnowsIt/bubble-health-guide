import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ConversationSolution {
  id: string;
  solution: string;
  category: string;
  confidence: number;
  reasoning?: string;
  created_at: string;
  updated_at: string;
}

interface SolutionFeedback {
  solution_text: string;
  feedback_type: 'helpful' | 'not_helpful';
}

export const useConversationSolutions = (conversationId?: string, patientId?: string) => {
  const { user } = useAuth();
  const [solutions, setSolutions] = useState<ConversationSolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const fetchSolutions = async () => {
    if (!conversationId || !user) {
      // No conversation or user - clear solutions silently
      setSolutions([]);
      return;
    }

    try {
      setLoading(true);
      // Fetching solutions for conversation
      const { data, error } = await supabase
        .from('conversation_solutions')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('confidence', { ascending: false });

      if (error) throw error;
      // Solutions loaded
      setSolutions(data || []);
    } catch (error) {
      console.error('Error fetching solutions:', error);
      setSolutions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingFeedback = async () => {
    if (!patientId || !user) return;

    try {
      const { data, error } = await supabase
        .from('solution_feedback')
        .select('solution_text, feedback_type')
        .eq('patient_id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;

      const feedbackMap: Record<string, string> = {};
      data?.forEach((item: SolutionFeedback) => {
        feedbackMap[item.solution_text] = item.feedback_type;
      });
      setFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const handleFeedback = async (solutionText: string, feedbackType: 'helpful' | 'not_helpful') => {
    if (!patientId || !user) return;

    try {
      await supabase
        .from('solution_feedback')
        .upsert({
          user_id: user.id,
          patient_id: patientId,
          solution_text: solutionText,
          feedback_type: feedbackType
        });

      setFeedback(prev => ({
        ...prev,
        [solutionText]: feedbackType
      }));
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [conversationId, user]);

  useEffect(() => {
    loadExistingFeedback();
  }, [patientId, user]);

  // Set up real-time subscription for new solutions
  useEffect(() => {
    if (!conversationId || !user) return;

    // Setting up real-time subscription for solutions

    const channel = supabase
      .channel('conversation-solutions-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_solutions',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Real-time solution added
          // Refetch solutions to get the latest data
          fetchSolutions();
        }
      )
      .subscribe();

    return () => {
      // Cleaning up real-time subscription
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Immediately clear state when switching patients to prevent stale data
  useEffect(() => {
    setSolutions([]);
    setFeedback({});
  }, [patientId]);

  return {
    solutions,
    loading,
    feedback,
    handleFeedback,
    refetch: fetchSolutions
  };
};