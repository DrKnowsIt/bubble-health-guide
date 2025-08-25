import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EasyChatQuestion {
  id: string;
  question_text: string;
  category: string;
  parent_question_id: string | null;
  response_leads_to: any;
  is_root: boolean;
}

interface EasyChatSession {
  id: string;
  user_id: string;
  patient_id: string | null;
  session_data: any;
  current_question_id: string | null;
  completed: boolean;
  final_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface EasyChatResponse {
  id: string;
  session_id: string;
  question_id: string;
  response_text: string;
  response_value: string;
  created_at: string;
}

export const useEasyChat = (patientId?: string) => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<EasyChatQuestion | null>(null);
  const [currentSession, setCurrentSession] = useState<EasyChatSession | null>(null);
  const [responses, setResponses] = useState<EasyChatResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationPath, setConversationPath] = useState<Array<{ question: EasyChatQuestion; response: string }>>([]);

  const startNewSession = useCallback(async () => {
    console.log('Starting Easy Chat session, user:', user);
    if (!user) {
      console.log('No user found, cannot start session');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating session with patient_id:', patientId);
      
      // Create new session
      const { data: sessionData, error: sessionError } = await supabase
        .from('easy_chat_sessions')
        .insert({
          user_id: user.id,
          patient_id: patientId || null,
          current_question_id: 'root_start'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('Session created:', sessionData);

      // Get root question
      const { data: questionData, error: questionError } = await supabase
        .from('easy_chat_questions')
        .select('*')
        .eq('id', 'root_start')
        .single();

      if (questionError) {
        console.error('Question fetch error:', questionError);
        throw questionError;
      }

      console.log('Root question found:', questionData);
      setCurrentSession(sessionData);
      setCurrentQuestion(questionData);
      setResponses([]);
      setConversationPath([]);
    } catch (error) {
      console.error('Error starting easy chat session:', error);
      // Set a fallback state so the component doesn't break
      setCurrentQuestion({
        id: 'error',
        question_text: 'Unable to load Easy Chat. Please try again later.',
        category: 'error',
        parent_question_id: null,
        response_leads_to: {},
        is_root: true
      });
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  const submitResponse = useCallback(async (responseValue: string, responseText: string) => {
    if (!currentSession || !currentQuestion || !user) return;

    try {
      setLoading(true);

      // Save response
      const { data: responseData, error: responseError } = await supabase
        .from('easy_chat_responses')
        .insert({
          session_id: currentSession.id,
          question_id: currentQuestion.id,
          response_text: responseText,
          response_value: responseValue
        })
        .select()
        .single();

      if (responseError) throw responseError;

      // Add to conversation path
      const newPath = [...conversationPath, { question: currentQuestion, response: responseText }];
      setConversationPath(newPath);
      
      // Update responses
      setResponses(prev => [...prev, responseData]);

      // Get next question ID
      const nextQuestionId = currentQuestion.response_leads_to[responseValue];
      
      if (!nextQuestionId || nextQuestionId === 'final_summary') {
        // End of conversation - generate summary
        await completeSession(newPath);
        return;
      }

      // Fetch next question
      const { data: nextQuestion, error: nextQuestionError } = await supabase
        .from('easy_chat_questions')
        .select('*')
        .eq('id', nextQuestionId)
        .single();

      if (nextQuestionError) throw nextQuestionError;

      // Update session with current question
      await supabase
        .from('easy_chat_sessions')
        .update({ current_question_id: nextQuestionId })
        .eq('id', currentSession.id);

      setCurrentQuestion(nextQuestion);
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSession, currentQuestion, user, conversationPath]);

  const completeSession = useCallback(async (path: Array<{ question: EasyChatQuestion; response: string }>) => {
    if (!currentSession) return;

    try {
      // Generate summary based on responses
      const summary = generateSummary(path);

      // Update session as completed
      await supabase
        .from('easy_chat_sessions')
        .update({ 
          completed: true, 
          final_summary: summary,
          session_data: { conversation_path: path.map(p => ({ question_id: p.question.id, question_text: p.question.question_text, response: p.response })) }
        })
        .eq('id', currentSession.id);

      setCurrentSession(prev => prev ? { ...prev, completed: true, final_summary: summary } : null);
      setCurrentQuestion(null);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [currentSession]);

  const generateSummary = (path: Array<{ question: EasyChatQuestion; response: string }>) => {
    const topics = path.map(p => `${p.question.question_text}: ${p.response}`).join('\n');
    return `Based on your responses, here are key topics to discuss with a healthcare provider:\n\n${topics}\n\nConsider scheduling an appointment to discuss these concerns in detail.`;
  };

  const getResponseOptions = useCallback(() => {
    if (!currentQuestion) return [];

    // Handle error state
    if (currentQuestion.id === 'error') {
      return [
        { value: 'retry', text: 'Try again' },
        { value: 'contact', text: 'Contact support' }
      ];
    }

    const responses = Object.keys(currentQuestion.response_leads_to || {});
    
    // Map response keys to user-friendly text
    const responseMap: Record<string, string> = {
      'symptoms': 'I have symptoms I\'m concerned about',
      'wellness': 'General wellness and prevention',
      'concerns': 'I have health concerns or questions',
      'check_results': 'I need help understanding test results',
      'pain': 'Pain or discomfort',
      'fever': 'Fever or feeling unwell',
      'breathing': 'Breathing difficulties',
      'digestive': 'Digestive issues',
      'skin': 'Skin problems',
      'mental': 'Mental health concerns',
      'fatigue': 'Fatigue or low energy',
      'head': 'Headache or head pain',
      'chest': 'Chest pain',
      'abdomen': 'Abdominal pain',
      'back': 'Back pain',
      'joints': 'Joint pain',
      'muscle': 'Muscle pain',
      'prevention': 'Disease prevention',
      'nutrition': 'Nutrition and diet',
      'exercise': 'Exercise and fitness',
      'sleep': 'Sleep issues',
      'stress': 'Stress management',
      'checkup': 'Regular checkup needed',
      'family_history': 'Family medical history concerns',
      'medication': 'Medication questions',
      'procedure': 'Medical procedure questions',
      'diagnosis': 'Questions about a diagnosis',
      'lab_results': 'Understanding lab results',
      'second_opinion': 'Want a second opinion',
      'continue': 'Continue',
      'none_above': 'None of the above',
      'other_issues': 'I have other concerns as well'
    };

    return responses.map(key => ({
      value: key,
      text: responseMap[key] || key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }, [currentQuestion]);

  return {
    currentQuestion,
    currentSession,
    responses,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    getResponseOptions,
    isCompleted: currentSession?.completed || false
  };
};