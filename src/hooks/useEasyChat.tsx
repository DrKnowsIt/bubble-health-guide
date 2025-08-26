import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EasyChatQuestion {
  id: string;
  question_text: string;
  category: string;
  is_root: boolean;
  parent_question_id: string | null;
  response_leads_to: Record<string, string>;
}

interface EasyChatSession {
  id: string;
  user_id: string;
  patient_id: string | null;
  session_data: any;
  completed: boolean;
  created_at: string;
  updated_at: string;
  current_question_id: string | null;
  final_summary: string | null;
}

interface EasyChatResponse {
  id: string;
  session_id: string;
  question_id: string;
  response_value: string;
  response_text: string;
  created_at: string;
}

interface DynamicQuestion {
  question: string;
  options: string[];
}

export const useEasyChat = (patientId?: string, selectedAnatomy?: string[]) => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<EasyChatQuestion | null>(null);
  const [currentSession, setCurrentSession] = useState<EasyChatSession | null>(null);
  const [responses, setResponses] = useState<EasyChatResponse[]>([]);
  const [conversationPath, setConversationPath] = useState<Array<{ question: EasyChatQuestion; response: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dynamicQuestion, setDynamicQuestion] = useState<DynamicQuestion | null>(null);
  const [healthTopics, setHealthTopics] = useState<any[]>([]);
  const [useDynamicQuestions, setUseDynamicQuestions] = useState(false);

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
          session_data: { 
            conversation_path: path.map(p => ({ 
              question_id: p.question.id, 
              question_text: p.question.question_text, 
              response: p.response 
            })),
            topics_for_doctor: path.slice(-3).map(p => ({
              topic: p.response,
              category: p.question.category,
              confidence: 0.8,
              created_at: new Date().toISOString()
            }))
          }
        })
        .eq('id', currentSession.id);

      setCurrentSession(prev => prev ? { ...prev, completed: true, final_summary: summary } : null);
      setCurrentQuestion(null);
      setDynamicQuestion(null);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [currentSession]);

  const generateSummary = (path: Array<{ question: EasyChatQuestion; response: string }>) => {
    const topics = path.map(p => `${p.question.question_text}: ${p.response}`).join('\n');
    return `Based on your responses, here are key topics to discuss with a healthcare provider:\n\n${topics}\n\nConsider scheduling an appointment to discuss these concerns in detail.`;
  };

  const generateNextQuestion = useCallback(async () => {
    try {
      console.log('Generating next dynamic question...');
      
        const { data, error } = await supabase.functions.invoke('generate-easy-chat-question', {
          body: { 
            conversationPath,
            patientId,
            anatomyContext: selectedAnatomy && selectedAnatomy.length > 0 
              ? `Body areas of interest: ${selectedAnatomy.join(', ')}`
              : ''
          }
        });

      if (error) {
        console.error('Error generating question:', error);
        throw error;
      }

      console.log('Generated question data:', data);
      setDynamicQuestion(data);
      
    } catch (error) {
      console.error('Failed to generate next question:', error);
      // Fallback to completion
      const newPath = [...conversationPath];
      await completeSession(newPath);
    }
  }, [conversationPath, patientId, completeSession]);

  const startNewSession = useCallback(async () => {
    console.log('Starting Easy Chat session, user:', user);
    if (!user) {
      console.log('No user found, cannot start session');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating session with patient_id:', patientId);
      
      // Reset states
      setCurrentQuestion(null);
      setDynamicQuestion(null);
      setUseDynamicQuestions(false);
      setConversationPath([]);
      setResponses([]);
      
      const sessionDataObj = { 
        started_at: new Date().toISOString(),
        ...(selectedAnatomy && selectedAnatomy.length > 0 ? { selected_anatomy: selectedAnatomy } : {})
      };

      // Create new session
      const { data: newSessionData, error: sessionError } = await supabase
        .from('easy_chat_sessions')
        .insert({
          user_id: user.id,
          patient_id: patientId || null,
          current_question_id: null,
          session_data: sessionDataObj
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('Session created:', newSessionData);
      setCurrentSession(newSessionData);

      // Start with root questions from database
      const { data: rootQuestions, error: rootError } = await supabase
        .from('easy_chat_questions')
        .select('*')
        .eq('is_root', true)
        .limit(1);

      if (rootError || !rootQuestions || rootQuestions.length === 0) {
        console.error('Error fetching root questions:', rootError);
        // Fallback to predefined first question with anatomy context
        let questionText = "What brings you here today? What's your main health concern?";
        if (selectedAnatomy && selectedAnatomy.length > 0) {
          const anatomyNames = selectedAnatomy.map(a => 
            a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          ).join(', ');
          questionText = `You've indicated concerns about: ${anatomyNames}. What specific issues are you experiencing in these areas?`;
        }

        setDynamicQuestion({
          question: questionText,
          options: [
            "I have pain or discomfort",
            "I'm feeling unwell or sick", 
            "I have questions about my health",
            "I want to discuss test results",
            "I need preventive care advice",
            "I have mental health concerns",
            "None of the above",
            "I have other concerns as well"
          ]
        });
        setUseDynamicQuestions(true);
      } else {
        // Use the first root question
        const rootQuestion = rootQuestions[0] as EasyChatQuestion;
        setCurrentQuestion(rootQuestion);
        
        // Update session with current question
        await supabase
          .from('easy_chat_sessions')
          .update({ 
            current_question_id: rootQuestion.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', newSessionData.id);
      }

    } catch (error) {
      console.error('Error starting easy chat session:', error);
      // Set a fallback state so the component doesn't break
      setDynamicQuestion({
        question: "What brings you here today? What's your main health concern?",
        options: [
          "I have pain or discomfort",
          "I'm feeling unwell or sick", 
          "I have questions about my health",
          "I want to discuss test results",
          "I need preventive care advice",
          "I have mental health concerns",
          "None of the above",
          "I have other concerns as well"
        ]
      });
      setUseDynamicQuestions(true);
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  const submitResponse = useCallback(async (responseValue: string, responseText: string) => {
    if (!currentSession || !user) {
      console.error('Cannot submit response: missing session or user');
      return;
    }

    // Handle "None of the above" or "Other concerns" specially
    if (responseValue === 'none_of_above' || responseValue === 'other_concerns') {
      console.log('User selected none/other, completing session');
      const newPath = [...conversationPath];
      if (currentQuestion || dynamicQuestion) {
        newPath.push({ 
          question: currentQuestion || { question_text: dynamicQuestion?.question || 'Question' } as EasyChatQuestion, 
          response: responseText 
        });
      }
      setConversationPath(newPath);
      await completeSession(newPath);
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting response:', { responseValue, responseText });

      // Save the response for dynamic questions (create a fake question ID)
      if (useDynamicQuestions && dynamicQuestion) {
        const fakeQuestionId = `dynamic_${Date.now()}`;
        
        const { error: responseError } = await supabase
          .from('easy_chat_responses')
          .insert({
            session_id: currentSession.id,
            question_id: fakeQuestionId,
            response_value: responseValue,
            response_text: responseText
          });

        if (responseError) {
          console.error('Error saving response:', responseError);
        }

        // Update conversation path
        const newPath = [...conversationPath, { 
          question: { question_text: dynamicQuestion.question } as EasyChatQuestion, 
          response: responseText 
        }];
        setConversationPath(newPath);

        // Generate next question or complete after 5 responses
        if (newPath.length >= 5) {
          console.log('Reached maximum questions, completing session');
          await completeSession(newPath);
        } else {
          await generateNextQuestion();
        }
        
      } else if (currentQuestion) {
        // Original logic for hardcoded questions
        const { error: responseError } = await supabase
          .from('easy_chat_responses')
          .insert({
            session_id: currentSession.id,
            question_id: currentQuestion.id,
            response_value: responseValue,
            response_text: responseText
          });

        if (responseError) {
          console.error('Error saving response:', responseError);
          throw responseError;
        }

        // Update conversation path
        const newPath = [...conversationPath, { question: currentQuestion, response: responseText }];
        setConversationPath(newPath);

        // Check if this response leads to another question
        const nextQuestionId = currentQuestion.response_leads_to[responseValue];
        
        if (nextQuestionId) {
          console.log('Loading next question:', nextQuestionId);
          
          const { data: nextQuestion, error: questionError } = await supabase
            .from('easy_chat_questions')
            .select('*')
            .eq('id', nextQuestionId)
            .single();

          if (questionError) {
            console.error('Error fetching next question:', questionError);
            // Switch to dynamic questions if hardcoded fails
            setUseDynamicQuestions(true);
            await generateNextQuestion();
            return;
          }

          if (nextQuestion) {
            setCurrentQuestion(nextQuestion as EasyChatQuestion);
            
            // Update session with new current question
            const { error: updateError } = await supabase
              .from('easy_chat_sessions')
              .update({ 
                current_question_id: nextQuestion.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentSession.id);

            if (updateError) {
              console.error('Error updating session:', updateError);
            }
          }
        } else {
          // No more hardcoded questions, switch to dynamic
          console.log('Switching to AI-generated questions after first response');
          setUseDynamicQuestions(true);
          await generateNextQuestion();
        }
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSession, currentQuestion, user, conversationPath, completeSession, useDynamicQuestions, dynamicQuestion, generateNextQuestion]);

  const getResponseOptions = useCallback(() => {
    if (useDynamicQuestions && dynamicQuestion) {
      return dynamicQuestion.options.map((option, index) => ({
        value: option === 'None of the above' ? 'none_of_above' : 
               option === 'I have other concerns as well' ? 'other_concerns' :
               `option_${index}`,
        text: option
      }));
    }
    
    if (!currentQuestion) return [];

    const options = Object.entries(currentQuestion.response_leads_to);
    
    // Convert the response_leads_to mapping to user-friendly options
    return options.map(([value, _]) => {
      let text = value;
      
      // Map common values to user-friendly text
      const valueMap: Record<string, string> = {
        'yes': 'Yes',
        'no': 'No',
        'mild': 'Mild',
        'moderate': 'Moderate', 
        'severe': 'Severe',
        'recent': 'Recently (within days)',
        'weeks': 'A few weeks ago',
        'months': 'Months ago',
        'years': 'Years ago',
        'morning': 'In the morning',
        'afternoon': 'In the afternoon',
        'evening': 'In the evening',
        'night': 'At night',
        'constant': 'All the time',
        'intermittent': 'Comes and goes',
        'stress_related': 'When I\'m stressed',
        'physical_activity': 'During physical activity',
        'rest': 'When I\'m resting',
        'eating': 'When eating',
        'sleeping': 'When sleeping'
      };
      
      return {
        value,
        text: valueMap[value] || value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    });
  }, [currentQuestion, useDynamicQuestions, dynamicQuestion]);

  return {
    currentQuestion: useDynamicQuestions ? { question_text: dynamicQuestion?.question || '' } as EasyChatQuestion : currentQuestion,
    currentSession,
    responses,
    conversationPath,
    loading,
    startNewSession,
    submitResponse,
    getResponseOptions,
    isCompleted: currentSession?.completed || false,
    hasActiveSession: !!currentSession && !currentSession.completed,
    hasResponses: conversationPath.length > 0,
    completeSession
  };
};