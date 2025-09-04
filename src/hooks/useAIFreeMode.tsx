import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSessionPersistence } from './useSessionPersistence';

interface AIFreeModeQuestion {
  id: string;
  question_text: string;
  category: string;
  is_root: boolean;
  parent_question_id: string | null;
  response_leads_to: Record<string, string>;
}

interface AIFreeModeSession {
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

interface AIFreeModeResponse {
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

export const useAIFreeMode = (patientId?: string, selectedAnatomy?: string[]) => {
  const { user } = useAuth();
  
  // Session persistence integration
  const sessionId = `aifreemode_${patientId || 'default'}_${user?.id || 'anonymous'}`;
  const { saveSessionData, loadSessionData, clearSessionData } = useSessionPersistence(sessionId);
  
  const [currentQuestion, setCurrentQuestion] = useState<AIFreeModeQuestion | null>(null);
  const [currentSession, setCurrentSession] = useState<AIFreeModeSession | null>(null);
  const [responses, setResponses] = useState<AIFreeModeResponse[]>([]);
  const [conversationPath, setConversationPath] = useState<Array<{ question: AIFreeModeQuestion; response: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [dynamicQuestion, setDynamicQuestion] = useState<DynamicQuestion | null>(null);
  const [healthTopics, setHealthTopics] = useState<any[]>([]);
  const [useDynamicQuestions, setUseDynamicQuestions] = useState(false);
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  // Save state to localStorage whenever important state changes
  const saveCurrentStateToLocalStorage = useCallback(() => {
    saveSessionData({
      conversationPath,
      dynamicQuestion,
      useDynamicQuestions,
      currentQuestionId: currentQuestion?.id,
      healthTopics
    });
  }, [conversationPath, dynamicQuestion, useDynamicQuestions, currentQuestion?.id, healthTopics, saveSessionData]);

  // Load state from localStorage on component mount
  useEffect(() => {
    const savedData = loadSessionData();
    if (savedData && user?.id && !isRecoveringSession) {
      console.log('Restoring AI Free Mode state from localStorage:', {
        conversationPath: savedData.conversationPath?.length || 0,
        dynamicQuestion: !!savedData.dynamicQuestion,
        useDynamicQuestions: savedData.useDynamicQuestions,
        healthTopics: savedData.healthTopics?.length || 0
      });

      if (savedData.conversationPath && savedData.conversationPath.length > 0) {
        setConversationPath(savedData.conversationPath);
      }
      
      if (savedData.dynamicQuestion) {
        setDynamicQuestion(savedData.dynamicQuestion);
      }
      
      if (savedData.useDynamicQuestions !== undefined) {
        setUseDynamicQuestions(savedData.useDynamicQuestions);
      }
      
      if (savedData.healthTopics) {
        setHealthTopics(savedData.healthTopics);
      }
    }
  }, [user?.id, loadSessionData, isRecoveringSession]);

  // Save state changes to localStorage
  useEffect(() => {
    if (user?.id && !isRecoveringSession) {
      saveCurrentStateToLocalStorage();
    }
  }, [conversationPath, dynamicQuestion, useDynamicQuestions, healthTopics, saveCurrentStateToLocalStorage, user?.id, isRecoveringSession]);

  const completeSession = useCallback(async (path: Array<{ question: AIFreeModeQuestion; response: string }>) => {
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
              question_id: p.question?.id || 'dynamic', 
              question_text: p.question?.question_text || 'Dynamic question', 
              response: p.response 
            })),
            topics_for_doctor: path.map(p => ({
              topic: p.response,
              category: p.question?.category || 'general',
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

  const generateSummary = (path: Array<{ question: AIFreeModeQuestion; response: string }>) => {
    const questionsAndAnswers = path.map(p => {
      const questionText = p.question?.question_text || 'Question';
      return `Q: ${questionText}\nA: ${p.response}`;
    }).join('\n\n');
    
    const topics = path.map(p => `• ${p.response}`).join('\n');
    
    return `DrKnowsIt - AI Health Assistant
www.drknowsit.com

AI FREE MODE SESSION SUMMARY

CONVERSATION DETAILS:
${questionsAndAnswers}

HEALTH DISCUSSION TOPICS FOR YOUR DOCTOR VISIT:
Based on your consultation, here are the key topics to discuss with your healthcare provider:

${topics}

NEXT STEPS:
• Schedule an appointment with your healthcare provider
• Bring this summary to your visit
• Be prepared to provide additional details about timing, severity, and any related symptoms
• Consider any questions you want to ask your doctor

This summary was generated by DrKnowsIt AI to help prepare you for your medical consultation. Always consult with qualified healthcare professionals for medical advice.`;
  };

  // Generate client-side fallback questions when API fails
  const generateClientFallbackQuestion = useCallback((
    path: Array<{ question: AIFreeModeQuestion; response: string }>,
    anatomy?: string[]
  ) => {
    const questionNumber = path.length + 1;
    
    // Create questions based on anatomy selection and conversation progress
    if (anatomy && anatomy.length > 0) {
      const primaryArea = anatomy[0].toLowerCase();
      
      if (questionNumber <= 5) {
        // Early questions focus on main symptoms
        if (primaryArea.includes('head')) {
          return {
            question: "When did these head-related symptoms first begin?",
options: [
              "Within the last few days",
              "Within the last week", 
              "Several weeks ago",
              "Months ago",
              "It's been ongoing for a long time",
              "I have other symptoms as well"
            ]
          };
        } else if (primaryArea.includes('chest')) {
          return {
            question: "How would you describe the intensity of your chest symptoms?",
options: [
              "Mild and occasional",
              "Moderate but manageable",
              "Severe and concerning",
              "Variable throughout the day",
              "Getting progressively worse",
              "I have other symptoms as well"
            ]
          };
        }
      } else {
        // Later questions focus on details and impact
        return {
          question: "How are these symptoms affecting your daily activities?",
options: [
            "Not impacting my routine",
            "Slightly limiting some activities", 
            "Significantly affecting my day",
            "Making it hard to work or function",
            "I need to rest frequently",
            "I have other symptoms as well"
          ]
        };
      }
    }
    
    // Generic fallback questions
    const genericQuestions = [
      {
        question: "Are there any specific triggers that make your symptoms worse?",
options: [
          "Physical activity or movement",
          "Certain foods or drinks",
          "Stress or emotional situations",
          "Weather changes",
          "No clear triggers I've noticed",
          "I have other symptoms as well"
        ]
      },
      {
        question: "Have you tried anything to help with your symptoms?",
options: [
          "Over-the-counter medications",
          "Rest and lifestyle changes", 
          "Home remedies",
          "Previously prescribed treatments",
          "Nothing has helped so far",
          "I have other symptoms as well"
        ]
      }
    ];
    
    return genericQuestions[questionNumber % genericQuestions.length];
  }, []);

  const checkIfReadyToComplete = useCallback(async (path: Array<{ question: AIFreeModeQuestion; response: string }>) => {
    // Minimum 10 questions, maximum 20 questions
    if (path.length < 10) {
      return false; // Never complete before 10 questions
    }
    
    if (path.length >= 20) {
      return true; // Always complete after 20 questions
    }
    
    // Between 10-20 questions, check AI confidence for completion
    try {
      const conversationContext = path.map(step => 
        `Q: ${step.question?.question_text || 'Unknown question'} A: ${step.response}`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('evaluate-easy-chat-completeness', {
        body: { 
          conversation_context: conversationContext,
          patient_id: patientId || '',
          conversation_length: path.length
        }
      });

      if (error) {
        console.error('Error checking completion readiness:', error);
        return false; // Continue if error, don't complete prematurely
      }

      return data?.should_complete || false;
    } catch (error) {
      console.error('Failed to check completion readiness:', error);
      return false; // Continue if error, don't complete prematurely
    }
  }, [patientId]);

  const generateNextQuestion = useCallback(async (retryCount = 0): Promise<void> => {
    const maxRetries = 2;
    
    try {
      console.log('Generating next dynamic question...');
      console.log('Current conversation path length:', conversationPath.length);
      conversationPath.forEach((item, index) => {
        console.log(`Path ${index + 1}: Q="${item.question?.question_text}" A="${item.response}"`);
      });
      
      const { data, error } = await supabase.functions.invoke('generate-easy-chat-question', {
        body: { 
          conversationPath,
          patientId,
          anatomyContext: selectedAnatomy && selectedAnatomy.length > 0 
            ? `Body areas of interest: ${selectedAnatomy.join(', ')}`
            : 'No specific anatomy areas selected'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function invocation failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        console.error('No data returned from function');
        throw new Error('No question data received from function');
      }

      console.log('Generated question data:', data);
      setDynamicQuestion(data);
      
      // Add a small delay to ensure DOM updates complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Failed to generate next question:', error);
      
      // Retry logic for API failures
      if (retryCount < maxRetries) {
        console.log(`Retrying question generation (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return generateNextQuestion(retryCount + 1);
      }
      
      // Check minimum questions before considering completion
      if (conversationPath.length < 10) {
        console.log('Not enough questions yet, generating fallback question');
        
        // Generate client-side fallback question based on anatomy and conversation length
        const fallbackQuestion = generateClientFallbackQuestion(conversationPath, selectedAnatomy);
        setDynamicQuestion(fallbackQuestion);
      } else {
        // Only complete if we have enough questions and AI confirms readiness
        console.log('Checking if ready to complete session...');
        const newSuccessPath = [...conversationPath];
        const shouldComplete = await checkIfReadyToComplete(newSuccessPath);
        
        if (shouldComplete) {
          console.log('Session ready to complete, generating health topics...');
          
          // Generate health topics before completing
          try {
            const conversationSummary = newSuccessPath.map(p => `${p.question?.question_text || 'Question'}: ${p.response}`).join('\n');
            
            const { data: topicsData, error: topicsError } = await supabase.functions.invoke('analyze-health-topics', {
              body: {
                conversation_context: conversationSummary,
                patient_id: patientId || '',
                anatomy_context: selectedAnatomy && selectedAnatomy.length > 0 
                  ? `Body areas of interest: ${selectedAnatomy.join(', ')}`
                  : 'General health inquiry'
              }
            });

            if (!topicsError && topicsData) {
              console.log('Generated health topics:', topicsData);
              setHealthTopics(topicsData.topics || []);
              
              // Save topics to database for persistence
              try {
                const topicsToSave = topicsData.topics || [];
                for (const topic of topicsToSave) {
                  await supabase
                    .from('conversation_diagnoses')
                    .insert({
                      conversation_id: currentSession?.id || crypto.randomUUID(),
                      patient_id: patientId || null,
                      user_id: user?.id || '',
                      diagnosis: topic.topic || topic.title || 'Health topic',
                      reasoning: topic.reasoning || topic.description || 'Generated from AI Free Mode conversation',
                      confidence: topic.confidence || 0.7,
                      category: 'general'
                    });
                }
                console.log('Successfully saved health topics to database');
              } catch (saveError) {
                console.error('Error saving health topics:', saveError);
                // Continue anyway - don't fail the completion
              }
            } else {
              console.error('Error generating health topics:', topicsError);
            }
          } catch (topicsGenerationError) {
            console.error('Failed to generate health topics:', topicsGenerationError);
            // Continue with session completion even if topics fail
          }
          
          await completeSession(newSuccessPath);
          return;
        } else {
          // Generate a final fallback question even after 10 questions
          const fallbackQuestion = generateClientFallbackQuestion(conversationPath, selectedAnatomy);
          setDynamicQuestion(fallbackQuestion);
        }
      }
      
      // Add delay for fallback questions too
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [conversationPath, patientId, completeSession, selectedAnatomy, checkIfReadyToComplete]);

  const recoverActiveSession = useCallback(async () => {
    if (!user?.id || isRecoveringSession) return null;
    
    try {
      setIsRecoveringSession(true);
      console.log('Checking for existing active session...');
      
      // First, try to restore from localStorage
      const savedData = loadSessionData();
      if (savedData && savedData.conversationPath && savedData.conversationPath.length > 0) {
        console.log('Found localStorage session with conversation path:', savedData.conversationPath.length);
        
        // Restore state from localStorage
        setConversationPath(savedData.conversationPath);
        if (savedData.dynamicQuestion) {
          setDynamicQuestion(savedData.dynamicQuestion);
        }
        if (savedData.useDynamicQuestions !== undefined) {
          setUseDynamicQuestions(savedData.useDynamicQuestions);
        }
        if (savedData.healthTopics) {
          setHealthTopics(savedData.healthTopics);
        }
        
        // Try to find corresponding database session
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        const { data: existingSessions } = await supabase
          .from('easy_chat_sessions')
          .select(`*`)
          .eq('user_id', user.id)
          .eq('completed', false)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingSessions && existingSessions.length > 0) {
          const session = existingSessions[0];
          console.log('Found matching database session:', session.id);
          setCurrentSession(session);
          return session;
        } else {
          // Create a new database session to match localStorage state
          console.log('Creating new database session to match localStorage state');
          const sessionDataObj = { 
            started_at: new Date().toISOString(),
            restored_from_localStorage: true,
            ...(selectedAnatomy && selectedAnatomy.length > 0 ? { selected_anatomy: selectedAnatomy } : {})
          };

          const { data: newSessionData } = await supabase
            .from('easy_chat_sessions')
            .insert({
              user_id: user.id,
              patient_id: patientId || null,
              current_question_id: null,
              session_data: sessionDataObj
            })
            .select()
            .single();

          if (newSessionData) {
            setCurrentSession(newSessionData);
            return newSessionData;
          }
        }
      }
      
      // Fallback to database-only recovery if no localStorage data
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: existingSessions, error } = await supabase
        .from('easy_chat_sessions')
        .select(`
          *,
          easy_chat_responses (*)
        `)
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking for existing sessions:', error);
        return null;
      }

      // Mark old incomplete sessions as abandoned
      const { error: abandonError } = await supabase
        .from('easy_chat_sessions')
        .update({ 
          completed: true, 
          final_summary: 'Session abandoned - started new session',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('completed', false)
        .lt('created_at', thirtyMinutesAgo);

      if (abandonError) {
        console.error('Error marking old sessions as abandoned:', abandonError);
      }

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        console.log('Found recent active session:', session.id, 'created:', session.created_at);
        
        // Restore conversation path from responses
        const sessionResponses = session.easy_chat_responses || [];
        const restoredPath = sessionResponses.map((resp: any) => ({
          question: { question_text: `Question ${resp.question_id}` } as AIFreeModeQuestion,
          response: resp.response_text
        }));
        
        setCurrentSession(session);
        setConversationPath(restoredPath);
        setResponses(sessionResponses);
        
        // Determine current state
        if (session.current_question_id) {
          // Try to load the current question
          const { data: question } = await supabase
            .from('easy_chat_questions')
            .select('*')
            .eq('id', session.current_question_id)
            .single();
            
          if (question) {
            setCurrentQuestion(question as AIFreeModeQuestion);
          } else {
            setUseDynamicQuestions(true);
          }
        } else {
          setUseDynamicQuestions(true);
        }
        
        return session;
      }
      
      console.log('No recent active sessions found, will start fresh');
      return null;
    } catch (error) {
      console.error('Error recovering session:', error);
      return null;
    } finally {
      setIsRecoveringSession(false);
    }
  }, [user?.id, isRecoveringSession, loadSessionData, selectedAnatomy, patientId]);

  const startNewSession = useCallback(async (forceNew = false) => {
    console.log('Starting AI Free Mode session, forceNew:', forceNew, 'user:', user?.id);
    if (!user?.id) {
      console.log('No user found, cannot start session');
      return;
    }

    // Prevent starting multiple sessions simultaneously
    if (loading && !forceNew) {
      console.log('Session already starting, skipping...');
      return;
    }

    // If forcing new, abandon any existing incomplete sessions first
    if (forceNew) {
      console.log('Forcing new session - abandoning any existing incomplete sessions');
      try {
        const { error: abandonError } = await supabase
          .from('easy_chat_sessions')
          .update({ 
            completed: true, 
            final_summary: 'Session abandoned - user started new session',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('completed', false);

        if (abandonError) {
          console.error('Error abandoning existing sessions:', abandonError);
        }
      } catch (error) {
        console.error('Error during session abandonment:', error);
      }
    }

    // Check for existing active session first (unless forced new)
    if (!forceNew && !currentSession) {
      const existingSession = await recoverActiveSession();
      if (existingSession) {
        console.log('Recovered existing session instead of starting new');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Creating new session with patient_id:', patientId);
      
      // Reset states completely
      setCurrentQuestion(null);
      setDynamicQuestion(null);
      setUseDynamicQuestions(false);
      setConversationPath([]);
      setResponses([]);
      setCurrentSession(null);
      
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

      // If anatomy is selected, skip hardcoded questions and go straight to AI-generated questions
      if (selectedAnatomy && selectedAnatomy.length > 0) {
        console.log('Anatomy selected, starting with AI-generated anatomy-aware questions');
        setUseDynamicQuestions(true);
        
        // Generate the first AI question with anatomy context
        try {
          const { data, error } = await supabase.functions.invoke('generate-easy-chat-question', {
            body: { 
              conversationPath: [], // Empty since this is the first question
              patientId,
              anatomyContext: `Body areas of interest: ${selectedAnatomy.join(', ')}`
            }
          });

          if (error) {
            console.error('Error generating first anatomy question:', error);
            throw error;
          }

          console.log('Generated first anatomy question:', data);
          setDynamicQuestion(data);
        } catch (error) {
          console.error('Failed to generate first anatomy question, using fallback:', error);
          // Fallback to a contextual question
          setDynamicQuestion({
            question: `What brings you to discuss your ${selectedAnatomy.join(' and ')} today?`,
options: [
              "I have pain or discomfort",
              "I noticed changes or symptoms", 
              "I have new symptoms in this area",
              "I want to understand something better",
              "I'm experiencing new sensations",
              "I have other symptoms as well"
            ]
          });
        }
      } else {
        // No anatomy selected, use hardcoded root question
        const { data: startingQuestions, error: questionError } = await supabase
          .from('easy_chat_questions')
          .select('*')
          .eq('is_root', true)
          .limit(1);

        if (questionError || !startingQuestions || startingQuestions.length === 0) {
          console.error('Error fetching starting questions:', questionError);
          // Fallback to generic dynamic question
          setDynamicQuestion({
            question: "What brings you here today? What's your main health concern?",
options: [
              "I have pain or discomfort",
              "I'm feeling unwell or sick", 
              "I have questions about my health",
              "I've noticed new symptoms",
              "I want to discuss my general wellness",
              "I have mental health symptoms",
              "I have other symptoms as well"
            ]
          });
          setUseDynamicQuestions(true);
        } else {
          // Use the root question
          const startingQuestion = startingQuestions[0] as AIFreeModeQuestion;
          setCurrentQuestion(startingQuestion);
          
          // Update session with current question
          await supabase
            .from('easy_chat_sessions')
            .update({ 
              current_question_id: startingQuestion.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', newSessionData.id);
        }
      }

    } catch (error) {
      console.error('Error starting AI Free Mode session:', error);
      // Set a fallback state so the component doesn't break
      setDynamicQuestion({
        question: "What brings you here today? What's your main health concern?",
options: [
          "I have pain or discomfort",
          "I'm feeling unwell or sick", 
          "I have questions about my health",
          "I've noticed new symptoms",
          "I want to discuss my general wellness",
          "I have mental health symptoms",
          "I have other symptoms as well"
        ]
      });
      setUseDynamicQuestions(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, patientId, loading, currentSession, recoverActiveSession]);

  const submitTextResponse = useCallback(async (textResponse: string) => {
    if (!currentSession || !user) {
      console.error('Cannot submit text response: missing session or user');
      return;
    }

    try {
      setLoading(true);
      console.log('Submitting text response:', textResponse);

      // Create a fake question for text responses
      const fakeQuestionId = `text_input_${Date.now()}`;
      
      const { error: responseError } = await supabase
        .from('easy_chat_responses')
        .insert({
          session_id: currentSession.id,
          question_id: fakeQuestionId,
          response_value: 'text_input',
          response_text: textResponse
        });

      if (responseError) {
        console.error('Error saving text response:', responseError);
      }

      // Update conversation path
      const currentQuestionText = useDynamicQuestions && dynamicQuestion 
        ? dynamicQuestion.question 
        : currentQuestion?.question_text || 'Describe your symptoms';
        
      const newPath = [...conversationPath, { 
        question: { question_text: currentQuestionText } as AIFreeModeQuestion, 
        response: textResponse 
      }];
      setConversationPath(newPath);

      // Check if we should complete (min 10, max 20 questions)
      const shouldComplete = await checkIfReadyToComplete(newPath);
      if (shouldComplete) {
        console.log('Session complete - either reached max questions (20) or AI confident with minimum questions (10+)');
        await completeSession(newPath);
        setLoading(false);
      } else {
        console.log('Continuing conversation after text input, switching to AI questions');
        setUseDynamicQuestions(true);
        await generateNextQuestion();
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error submitting text response:', error);
      setLoading(false);
    }
    // Remove finally block since we handle loading manually now
  }, [currentSession, currentQuestion, user, conversationPath, completeSession, useDynamicQuestions, dynamicQuestion, checkIfReadyToComplete, generateNextQuestion]);

  const submitResponse = useCallback(async (responseValue: string, responseText: string) => {
    if (!currentSession || !user) {
      console.error('Cannot submit response: missing session or user');
      return;
    }

    // Handle "I have other symptoms as well" - this should trigger text input mode, not completion
    if (responseValue === 'other_concerns') {
      console.log('User selected other symptoms, showing text input for custom response');
      // Don't complete here - let the user type their response and continue the flow
      return 'show_text_input';
    }

    try {
      setLoading(true);
      console.log('Submitting response:', { responseValue, responseText });

      // IMPORTANT: If anatomy is selected, ALWAYS use AI-generated questions, never hardcoded ones
      if (selectedAnatomy && selectedAnatomy.length > 0) {
        console.log('Anatomy selected - forcing AI-generated questions only');
        
        // Ensure we're using dynamic questions
        if (!useDynamicQuestions) {
          setUseDynamicQuestions(true);
        }
        
        const fakeQuestionId = `dynamic_anatomy_${Date.now()}`;
        
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
          setLoading(false);
          return;
        }

        // Update conversation path with current question text
        const currentQuestionText = (useDynamicQuestions && dynamicQuestion) 
          ? dynamicQuestion.question 
          : currentQuestion?.question_text || 'Question';
          
        const newPath = [...conversationPath, { 
          question: { question_text: currentQuestionText } as AIFreeModeQuestion, 
          response: responseText 
        }];
        setConversationPath(newPath);

        // Check if we should complete (min 10, max 20 questions)
        const shouldComplete = await checkIfReadyToComplete(newPath);
        if (shouldComplete) {
          console.log('Session complete - either reached max questions (20) or AI confident with minimum questions (10+)');
          await completeSession(newPath);
          setLoading(false);
        } else {
          await generateNextQuestion();
          setLoading(false);
        }
        
      } else if (useDynamicQuestions && dynamicQuestion) {
        // Handle dynamic questions when no anatomy is selected
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
          setLoading(false);
          return;
        }

        // Update conversation path
        const newPath = [...conversationPath, { 
          question: { question_text: dynamicQuestion.question } as AIFreeModeQuestion, 
          response: responseText 
        }];
        setConversationPath(newPath);

        // Check if we should complete (min 10, max 20 questions)
        const shouldComplete = await checkIfReadyToComplete(newPath);
        if (shouldComplete) {
          console.log('Session complete - either reached max questions (20) or AI confident with minimum questions (10+)');
          await completeSession(newPath);
          setLoading(false);
        } else {
          await generateNextQuestion();
          setLoading(false);
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
          setLoading(false);
          return;
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
            setLoading(false);
            return;
          }

          if (nextQuestion) {
            setCurrentQuestion(nextQuestion as AIFreeModeQuestion);
            
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
            setLoading(false);
          }
        } else {
          // No more hardcoded questions, switch to dynamic
          console.log('Switching to AI-generated questions after first response');
          setUseDynamicQuestions(true);
          await generateNextQuestion();
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      setLoading(false);
    }
  }, [currentSession, currentQuestion, user, conversationPath, completeSession, useDynamicQuestions, dynamicQuestion, generateNextQuestion, checkIfReadyToComplete]);

  const getResponseOptions = useCallback(() => {
    if (useDynamicQuestions && dynamicQuestion) {
      return dynamicQuestion.options.map((option, index) => ({
        value: option === 'I have other symptoms as well' ? 'other_concerns' :
               `option_${index}`,
        text: option
      }));
    }
    
    if (!currentQuestion) return [];

    const options = Object.entries(currentQuestion.response_leads_to)
      .filter(([value]) => value !== 'none_above' && value !== 'check_results'); // Filter out none_above and check_results
    
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
    currentQuestion: useDynamicQuestions ? { question_text: dynamicQuestion?.question || '' } as AIFreeModeQuestion : currentQuestion,
    currentSession,
    responses,
    conversationPath,
    loading: loading || isRecoveringSession,
    startNewSession,
    submitResponse,
    submitTextResponse,
    getResponseOptions,
    isCompleted: currentSession?.completed || false,
    hasActiveSession: !!currentSession && !currentSession.completed,
    hasResponses: conversationPath.length > 0,
    completeSession,
    checkIfReadyToComplete,
    recoverActiveSession
  };
};
