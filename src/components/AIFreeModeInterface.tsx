import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, CheckCircle, RefreshCw, AlertTriangle, Brain, Target, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useAIFreeMode } from '@/hooks/useAIFreeMode';
import { supabase } from '@/integrations/supabase/client';
import { AIFreeModeTopicsPanel } from './AIFreeModeTopicsPanel';
import { AnatomySelector } from './AnatomySelector';
import { AIFreeModeCompletionModal } from './modals/AIFreeModeCompletionModal';
import { useMedicalImagePrompts } from '@/hooks/useMedicalImagePrompts';
import { useSubscription } from '@/hooks/useSubscription';

type ChatPhase = 'anatomy-selection' | 'chat' | 'completed';

interface AIFreeModeInterfaceProps {
  patientId?: string;
  selectedAnatomy?: string[];
  onFinish?: () => void;
  onRestart?: () => void;
  useAIFreeModeHook?: any; // Allow flexibility for enhanced hook
}

export const AIFreeModeInterface = ({ 
  patientId,
  selectedAnatomy,
  onFinish,
  onRestart,
  useAIFreeModeHook
}: AIFreeModeInterfaceProps) => {
  const [phase, setPhase] = useState<ChatPhase>('anatomy-selection');
  const [selectedAnatomyState, setSelectedAnatomyState] = useState<string[]>(selectedAnatomy || []);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionRecovered, setSessionRecovered] = useState(false);
  
  const { subscription_tier } = useSubscription();
  const { 
    currentPrompt: medicalImagePrompt,
    triggerImagePrompt,
    handleImageFeedback,
    closeImagePrompt 
  } = useMedicalImagePrompts();

  // Session persistence - use stable session ID that doesn't change on refresh
  const sessionId = `enhanced_${patientId || 'default'}_aifreechat`;
  const { saveSessionData, loadSessionData, clearSessionData } = useSessionPersistence(sessionId);

  // Use the enhanced hook if provided, otherwise use the base hook with enhanced features
  const hookResult = useAIFreeModeHook || useAIFreeMode(patientId, selectedAnatomyState);
  
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
    healthTopics,
    completeCurrentSession
  } = hookResult;

  // Local state for text input mode
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Save session data whenever important state changes
  const saveCurrentState = useCallback(() => {
    saveSessionData({
      phase,
      selectedAnatomy: selectedAnatomyState,
      conversationPath,
      healthTopics: healthTopics || [],
      sessionComplete: showCompletionModal,
      timestamp: Date.now()
    });
  }, [phase, selectedAnatomyState, conversationPath, healthTopics, showCompletionModal, saveSessionData]);

  // Load session data on mount
  useEffect(() => {
    const savedData = loadSessionData();
    if (savedData && !sessionRecovered) {
      logger.debug('Loading saved session data:', savedData);
      
      if (savedData.phase) {
        setPhase(savedData.phase as ChatPhase);
        
        if (savedData.selectedAnatomy) {
          setSelectedAnatomyState(savedData.selectedAnatomy);
        }
        
        if (savedData.sessionComplete) {
          setShowCompletionModal(true);
        }
        
        setSessionRecovered(true);
        logger.debug('Session state restored from localStorage');
      }
    }
  }, [loadSessionData, sessionRecovered]);

  // Save state changes (but not for completed sessions)
  useEffect(() => {
    if (sessionRecovered || phase !== 'anatomy-selection') {
      // Don't save state if session is completed
      if (!showCompletionModal && !isCompleted) {
        saveCurrentState();
      }
    }
  }, [phase, selectedAnatomyState, conversationPath, saveCurrentState, sessionRecovered, showCompletionModal, isCompleted]);

  useEffect(() => {
    // Auto-start session when component mounts, but only once
    if (phase === 'chat' && !currentSession && !loading && !hasActiveSession) {
      startNewSession();
    }
  }, [phase, currentSession, loading, hasActiveSession]); // Remove startNewSession from dependencies

  const handleAnatomySelection = (anatomy: string[]) => {
    setSelectedAnatomyState(anatomy);
    setPhase('chat');
    // Always force new session when coming from anatomy selection - this ensures fresh start
    logger.debug('Starting fresh AI Free Mode session from anatomy selection');
    startNewSession(true);
  };

  const handleFinishChat = () => {
    if (completeCurrentSession) {
      completeCurrentSession();
    }
    setShowCompletionModal(true);
  };

  const handleStartNewChat = () => {
    logger.debug('Starting completely new chat - clearing saved data');
    clearSessionData();
    setPhase('anatomy-selection');
    setSelectedAnatomyState([]);
    setShowCompletionModal(false);
    setSessionRecovered(false);
  };

  const handleRestartAnalysis = async () => {
    logger.debug('Restarting analysis - clearing saved data and abandoning active session');
    
    // Clear localStorage first
    clearSessionData();
    
    // Abandon any active database session
    if (hasActiveSession) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase
            .from('easy_chat_sessions')
            .update({ 
              completed: true, 
              final_summary: 'Session restarted by user',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('completed', false);
        }
      } catch (error) {
        console.error('Error abandoning session during restart:', error);
      }
    }
    
    // Reset all state
    setPhase('anatomy-selection');
    setSelectedAnatomyState([]);
    setShowCompletionModal(false);
    setSessionRecovered(false);
  };

  // Handle completed session and clear saved data
  useEffect(() => {
    if (isCompleted && phase === 'chat') {
      setShowCompletionModal(true);
      // Clear session data when completed
      clearSessionData();
    }
  }, [isCompleted, phase, clearSessionData]);

  // Session recovery - restore active sessions on page refresh (but not during intentional restarts)
  useEffect(() => {
    if (hasActiveSession && currentSession && !sessionRecovered && phase === 'anatomy-selection') {
      // Only recover if this isn't a fresh restart (check if we have saved session data)
      const savedData = loadSessionData();
      if (savedData && savedData.phase === 'chat') {
        logger.debug('Recovering active session from page refresh');
        
        // Extract selected anatomy from session data
        const sessionData = currentSession.session_data as any;
        if (sessionData?.selected_anatomy) {
          setSelectedAnatomyState(sessionData.selected_anatomy);
          setPhase('chat');
          setSessionRecovered(true);
          logger.debug('Session recovered with anatomy:', sessionData.selected_anatomy);
        }
      }
    }
  }, [hasActiveSession, currentSession, sessionRecovered, phase, loadSessionData]);

  const handleResponseClick = async (value: string, text: string) => {
    // Prevent interaction during loading
    if (loading) return;
    
    if (value === 'other_concerns') {
      setShowTextInput(true);
      return;
    }
    
    // Submit the response
    submitResponse(value, text);
    
    // For Basic/Pro users, trigger medical image prompts based on symptoms
    if ((subscription_tier === 'basic' || subscription_tier === 'pro') && text && patientId) {
      logger.debug('Triggering medical image analysis for Basic/Pro user');
      const conversationContext = conversationPath.map(p => 
        `Q: ${p.question?.question_text} A: ${p.response}`
      );
      
      await triggerImagePrompt(text, undefined, conversationContext);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    logger.debug('Submitting custom text response:', textInput.trim());
    
    if (submitTextResponse) {
      submitTextResponse(textInput.trim());
    } else {
      submitResponse('other_concerns', textInput.trim());
    }
    
    setTextInput('');
    setShowTextInput(false);
  };

  const handleBackToOptions = () => {
    setShowTextInput(false);
    setTextInput('');
  };

  const handleStartOver = () => {
    startNewSession();
  };

  const handleRestart = () => {
    if (onRestart) {
      onRestart();
    } else {
      startNewSession();
    }
  };

  if (phase === 'anatomy-selection') {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <AnatomySelector onSelectionComplete={handleAnatomySelection} />
      </div>
    );
  }

  if (loading && !currentQuestion) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Starting AI Free Mode...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex gap-4 overflow-hidden">
        {/* Conversation History Panel */}
        {conversationPath.length > 0 && (
          <Card className="w-80 flex-shrink-0 bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                <MessageCircle className="h-4 w-4" />
                Conversation History
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <CardContent className="pt-3 space-y-3 px-4">
                {conversationPath.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-muted/50 border border-border p-3 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Question {index + 1}
                      </p>
                      <p className="text-sm text-foreground">
                        {item.question?.question_text || 'Loading question...'}
                      </p>
                    </div>
                    <div className="bg-primary/20 border border-primary/30 p-3 rounded-lg">
                      <p className="text-xs font-medium text-primary mb-1">
                        Your Answer
                      </p>
                      <p className="text-sm text-foreground">
                        {item.response}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </ScrollArea>
          </Card>
        )}

        {/* Medical Image Prompt for Basic/Pro Users */}
        {medicalImagePrompt && medicalImagePrompt.isVisible && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Visual Comparison</span>
                <Badge variant="secondary" className="text-xs">
                  {subscription_tier === 'pro' ? 'Pro' : 'Basic'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Does your condition look similar to any of these images?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {medicalImagePrompt.images.slice(0, 6).map((image, index) => (
                  <div key={index} className="relative group cursor-pointer">
                    <img 
                      src={image.imageUrl} 
                      alt={image.description}
                      className="w-full h-20 object-cover rounded border hover:border-primary/50 transition-colors"
                      onClick={() => handleImageFeedback(image.id, true, medicalImagePrompt.searchTerm, currentSession?.id, patientId)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 text-xs">
                <Button size="sm" variant="outline" onClick={closeImagePrompt}>
                  None match
                </Button>
                <Button size="sm" variant="outline" onClick={closeImagePrompt}>
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Chat Area - Center */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
          {/* Selected Anatomy & Progress indicator */}
          <div className="flex items-center justify-between mb-2">
            {selectedAnatomyState && selectedAnatomyState.length > 0 && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <div className="flex flex-wrap gap-1">
                  {selectedAnatomyState.slice(0, 3).map((area) => (
                    <Badge key={area} variant="outline" className="text-xs">
                      {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                  {selectedAnatomyState.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedAnatomyState.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {conversationPath.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {conversationPath.length} questions answered • AI evaluating health topics
              </div>
            )}
          </div>

          {/* Current Question or Summary - Main Content */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1">
              <CardContent className="p-6">
              {isCompleted ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <h3 className="font-semibold">Session Complete!</h3>
                  </div>
                  
                  {currentSession?.final_summary && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-line">
                        {currentSession.final_summary}
                      </p>
                    </div>
                  )}

                  <Separator />
                  
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Want more detailed analysis and personalized AI conversations?
                    </p>
                    <Button className="w-full">
                      Upgrade for Full AI Chat
                    </Button>
                  </div>

                  {onFinish && (
                    <Button 
                      onClick={onFinish}
                      className="w-full"
                    >
                      Export Results
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    onClick={handleRestartAnalysis}
                    className="w-full"
                  >
                    Start New AI Free Mode
                  </Button>
                </div>
              ) : currentQuestion ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">AI Free Mode</span>
                      <Badge variant="secondary" className="ml-2">Free</Badge>
                      {hasActiveSession && hasResponses && (
                        <Badge variant="outline" className="ml-1">In Progress</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2 leading-tight">
                      {currentQuestion.question_text}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Please select the option that best describes your situation:
                    </p>
                  </div>

                  {showTextInput ? (
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                          Please describe your other health symptoms in detail:
                        </p>
                      </div>
                      <Textarea
                        placeholder="Type your symptoms here... (e.g., I've been experiencing headaches and fatigue lately)"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        maxLength={200}
                        className="min-h-[100px] resize-none"
                        disabled={loading}
                      />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Describe your specific symptoms (up to 200 characters)</span>
                        <span className={textInput.length > 180 ? "text-orange-500" : ""}>
                          {textInput.length}/200
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleTextSubmit}
                          disabled={!textInput.trim() || loading}
                          className="flex-1"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit Symptoms
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBackToOptions}
                          disabled={loading}
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 relative">
                      {/* Loading overlay for response options */}
                      {loading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating next question...</span>
                          </div>
                        </div>
                      )}
                      
                      {getResponseOptions().map((option, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className={`justify-start text-left h-auto px-3 py-2 hover:bg-primary/5 hover:border-primary/20 w-full transition-all ${
                            loading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => handleResponseClick(option.value, option.text)}
                          disabled={loading}
                        >
                          <span className="whitespace-normal text-sm leading-snug">
                            {option.text}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-border space-y-2">
                    {onFinish && conversationPath.length > 2 && (
                      <Button 
                        onClick={onFinish}
                        className="w-full"
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finish & Export Results
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      onClick={handleRestartAnalysis}
                      className="w-full"
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restart Analysis
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">AI Free Mode</h3>
                      <Badge variant="secondary" className="mt-1">Free</Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Get personalized health guidance through our guided conversation
                  </p>
                  <div className="flex justify-center">
                    <Button onClick={handleRestartAnalysis} disabled={loading}>
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Starting...
                        </>
                      ) : (
                        hasActiveSession ? 'Restart' : 'Begin AI Free Mode'
                      )}
                    </Button>
                  </div>
                </div>
              )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>

        {/* Right Sidebar - Health Topics */}
        <div className="w-80 flex-shrink-0">
          <AIFreeModeTopicsPanel
            conversationPath={conversationPath}
            patientName={patientId || 'User'}
            patientId={patientId || 'default'}
            sessionId={currentSession?.id}
            healthTopics={healthTopics}
          />
        </div>
      </div>
      
      <AIFreeModeCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onStartNewChat={handleStartNewChat}
        sessionData={{
          selectedAnatomy: selectedAnatomyState,
          conversationPath,
          healthTopics: healthTopics || [],
          finalSummary: currentSession?.final_summary
        }}
      />
    </>
  );
};