import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, History, ChevronDown, ChevronUp, Users, X, ImagePlus, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsersQuery, User } from '@/hooks/optimized/useUsersQuery';
import { useConversationsQuery, Message } from '@/hooks/optimized/useConversationsQuery';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useSubscription } from '@/hooks/useSubscription';
import { useAnalysisNotifications } from '@/hooks/useAnalysisNotifications';
import { useUnifiedAnalysis } from '@/hooks/useUnifiedAnalysis';
import { useMedicalImagePrompts } from '@/hooks/useMedicalImagePrompts';
import { useRequestDebounce } from '@/hooks/useRequestDebounce';
import EnhancedHealthInsightsPanel from '../health/EnhancedHealthInsightsPanel';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from '../UserDropdown';
import { UserSelectionGuide } from '../UserSelectionGuide';
import { SubscriptionGate } from '../SubscriptionGate';
import { ChatMessage } from './ChatMessage';
import { ChatAnalysisNotification } from '../ChatAnalysisNotification';
import { MedicalImageConfirmationModal } from '../modals/MedicalImageConfirmationModal';
import { RequestCooldownIndicator } from '../ui/request-cooldown-indicator';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleTokenTimeout } from '@/hooks/useSimpleTokenTimeout';
import { SimpleTokenTimeoutNotification } from './SimpleTokenTimeoutNotification';

interface MobileEnhancedChatInterfaceProps {
  selectedUser?: User | null;
  onUserSelect?: (user: User | null) => void;
}

export const MobileEnhancedChatInterface = ({ 
  selectedUser: propSelectedUser, 
  onUserSelect 
}: MobileEnhancedChatInterfaceProps) => {
  const { user } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { users, selectedUser: hookSelectedUser, setSelectedUser, loading: usersLoading } = useUsersQuery();
  const { isInTimeout, handleTokenLimitError } = useSimpleTokenTimeout();
  
  // Request debouncing and loop prevention
  const {
    canMakeRequest,
    startRequest,
    completeRequest,
    getRemainingCooldown,
    getBlockTimeRemaining,
    isInCooldown,
    isBlocked
  } = useRequestDebounce();
  
  // Use prop user if provided, otherwise use hook user
  const selectedUser = propSelectedUser !== undefined ? propSelectedUser : hookSelectedUser;
  const handleUserSelect = onUserSelect || setSelectedUser;
  
  const { 
    messages, 
    loading: messagesLoading, 
    setMessages,
    currentConversation,
    selectConversation,
    createConversation,
    saveMessage,
    updateConversationTitleIfPlaceholder,
    startNewConversation 
  } = useConversationsQuery();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showDiagnoses, setShowDiagnoses] = useState(false);
  const [patientSelectorCollapsed, setPatientSelectorCollapsed] = useState(true);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [messageAnalysis, setMessageAnalysis] = useState<{[key: string]: any}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stale reply guard
  const requestSeqRef = useRef(0);
  const convAtRef = useRef<string | null>(currentConversation);

  // Unified analysis system
  const { 
    analysisState, 
    updateMessageCount, 
    checkScheduledAnalysis,
    cleanup 
  } = useUnifiedAnalysis({
    conversationId: currentConversation,
    patientId: selectedUser?.id || null,
    onAnalysisComplete: (results) => {
      console.log('[MobileChat] Analysis completed:', results);
    }
  });

  // Legacy analysis notifications (for background features)
  const {
    startAnalysis,
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis
  } = useAnalysisNotifications(currentConversation, selectedUser?.id || null);

  // Medical image prompts
  const { 
    currentPrompt, 
    loading: imagePromptLoading, 
    triggerImagePrompt, 
    handleImageFeedback, 
    closeImagePrompt 
  } = useMedicalImagePrompts();


  const {
    isRecording,
    isProcessing,
    toggleRecording
  } = useVoiceRecording({
    onTranscription: (text) => setInputValue(text)
  });

  const { uploadImage, isUploading } = useImageUpload({
    onImageUploaded: (imageUrl) => {
      setPendingImageUrl(imageUrl);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Load diagnoses when conversation or patient changes
  useEffect(() => {
    if (currentConversation && selectedUser?.id) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedUser?.id]);

  // Real-time subscription for diagnosis updates
  useEffect(() => {
    if (!currentConversation || !selectedUser?.id) return;

    const diagnosisChannel = supabase
      .channel(`mobile-diagnosis-realtime-${currentConversation}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${currentConversation}`
        },
        () => {
          loadDiagnosesForConversation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(diagnosisChannel);
    };
  }, [currentConversation, selectedUser?.id]);

  const loadDiagnosesForConversation = async () => {
    if (!currentConversation || !selectedUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', currentConversation)
        .eq('patient_id', selectedUser.id)
        .order('confidence', { ascending: false });

      if (error) {
        console.error('Error loading diagnoses:', error);
        return;
      }

      setDiagnoses(data || []);
    } catch (error) {
      console.error('Error loading diagnoses:', error);
    }
  };

  // Invalidate in-flight requests when conversation changes
  useEffect(() => {
    convAtRef.current = currentConversation;
    requestSeqRef.current += 1;
    setIsTyping(false);
    // Clear analysis state when conversation changes to prevent stale notifications
    setMessageAnalysis({});
  }, [currentConversation]);


  const handleSendMessage = async () => {
    const messageContent = inputValue.trim() || pendingImageUrl;
    if (!messageContent) return;
    if (!selectedUser) {
      toast({ title: 'No patient selected', description: 'Please select a patient first.', variant: 'destructive' });
      return;
    }
    if (isInTimeout) {
      toast({ 
        title: 'Chat timeout active', 
        description: 'Please wait for the timeout to expire before continuing.',
        variant: 'destructive' 
      });
      return;
    }

    // Check request debouncing
    const { allowed, reason } = canMakeRequest();
    if (!allowed) {
      toast({ title: 'Please wait', description: reason, variant: 'destructive' });
      return;
    }

    const imageUrl = pendingImageUrl || undefined;
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      image_url: imageUrl
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setPendingImageUrl(null);

    // Ensure conversation exists
    let conversationId = currentConversation;
    if (!conversationId) {
      const title = messageContent.length > 50 ? messageContent.slice(0, 50) + '...' : messageContent;
      conversationId = await createConversation(title, selectedUser.id);
      if (!conversationId) {
        toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
        return;
      }
    }

    // Save user message
    await saveMessage(conversationId, 'user', messageContent, imageUrl);
    await updateConversationTitleIfPlaceholder(conversationId, messageContent.length > 50 ? messageContent.slice(0, 50) + '...' : messageContent);

    // Mark this request and capture conversation at send time
    const reqId = ++requestSeqRef.current;
    const convoAtSend = conversationId || null;

    setIsTyping(true);

    try {
      const conversationHistory = messages.filter(msg => msg.id !== 'welcome');
      const { data, error } = await supabase.functions.invoke('grok-chat', {
        body: { 
          message: messageContent,
          conversation_history: conversationHistory,
          patient_id: selectedUser.id,
          user_id: user.id,
          conversation_id: conversationId,
          image_url: imageUrl
        }
      });

      if (error) throw error;

      const aiResponse = data.message || 'I apologize, but I am unable to process your request at the moment.';

      // Guard against stale responses
      if (reqId !== requestSeqRef.current || convAtRef.current !== convoAtSend) {
        return;
      }

      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(conversationId, 'ai', aiMessage.content);

      // Track tokens after successful response - handled by server now

      // Background operations - run without affecting typing state
      setTimeout(async () => {
        // Check for AI image suggestion or trigger based on user message
        const recentContext = [...messages, 
          { type: 'user', content: messageContent }
        ].slice(-4).map(msg => 
          `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        );
        
        // Only trigger image prompts for human patients, not pets
        if (!selectedUser?.is_pet) {
          if (data.imageSuggestion) {
            triggerImagePrompt(messageContent, data.imageSuggestion, recentContext);
          } else {
            triggerImagePrompt(messageContent, undefined, recentContext);
          }
        }
      }, 100); // Small delay to ensure typing state is properly managed

      // Background analysis - run separately without affecting main chat flow
      setTimeout(() => {
        // Call separate diagnosis analysis (background)
        const recentMessages = [...messages, 
          { type: 'user', content: messageContent },
          { type: 'ai', content: aiResponse }
        ]; // Use full conversation instead of slice(-6)

        supabase.functions.invoke('analyze-conversation-diagnosis', {
          body: {
            conversation_id: conversationId,
            patient_id: selectedUser.id,
            recent_messages: recentMessages
          }
        }).then(() => {
          // Reload diagnoses after analysis
          loadDiagnosesForConversation();
        }).catch(error => {
          console.error('Error analyzing conversation for diagnosis:', error);
        });

        // Update message count and trigger unified analysis
        const newMessageCount = analysisState.messageCount + 1;
        if (updateMessageCount) {
          updateMessageCount(newMessageCount);
        }
        
        // Check for scheduled analysis (regular every 4, deep every 16)
        const allMessages = [...messages, userMessage, aiMessage];
        checkScheduledAnalysis(allMessages);
      }, 200); // Delay background analyses to avoid interfering with typing state
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      if (reqId !== requestSeqRef.current || convAtRef.current !== convoAtSend) {
        return;
      }

      // Handle token limit timeout (429 status or token limit message)
      if (error?.status === 429 || error?.message?.includes('token limit')) {
        // Handle server-side token timeout
        handleTokenLimitError(error);
        // Don't show an error toast - the UI will show the timeout notification
        return;
      }

      const msg = typeof error?.message === 'string' && /subscription|upgrade/i.test(error.message)
        ? 'This feature requires a Pro subscription. Please upgrade to continue.'
        : 'Failed to send message. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    try {
      await selectConversation(conversationId);
      setShowHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewConversation = async () => {
    if (!selectedUser) return;
    // Reset to a fresh state; actual conversation will be created on first message
    startNewConversation();
    setShowHistory(false);
  };

  const hasAccess = (requiredTier: string) => {
    if (!subscribed || !subscription_tier) return false;
    if (requiredTier === 'basic') {
      return subscription_tier === 'basic' || subscription_tier === 'pro';
    }
    if (requiredTier === 'pro') {
      return subscription_tier === 'pro';
    }
    return false;
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start unlimited conversations with our advanced AI health assistant. Get personalized insights, symptom analysis, and health recommendations with a Basic or Pro subscription.">
      <div className="h-full flex flex-col bg-background">
        {/* Stacked Patient Header */}
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
          {/* Row 1: Patient Selector */}
          <div className="p-3 border-b border-border/50">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="w-full h-auto p-3 hover:bg-muted/50 justify-start">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-base truncate">
                        {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Select Patient'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tap to change patient
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[40vh]">
                <SheetHeader>
                  <SheetTitle>Select Patient</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <UserDropdown
                    users={users}
                    selectedUser={selectedUser}
                    onUserSelect={handleUserSelect}
                    open={false}
                    onOpenChange={() => {}}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Row 2: Action Buttons */}
          <div className="p-2 flex items-center gap-2">
            {/* History Button */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 h-10 gap-2">
                  <History className="h-4 w-4" />
                  <span className="text-sm">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-80">
                <SheetHeader>
                  <SheetTitle>Conversation History</SheetTitle>
                </SheetHeader>
                <div className="mt-4 h-full overflow-hidden">
                  <ConversationHistory
                    selectedPatientId={selectedUser?.id}
                    onConversationSelect={handleConversationSelect}
                    onNewConversation={handleNewConversation}
                    activeConversationId={currentConversation}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Health Topics Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 h-10 gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm">Topics</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh]">
                <SheetHeader>
                  <SheetTitle>Health Topics</SheetTitle>
                </SheetHeader>
                <div className="mt-4 overflow-auto h-[calc(60vh-80px)]">
                  <EnhancedHealthInsightsPanel 
                    diagnoses={diagnoses.map(d => ({
                      diagnosis: d.diagnosis,
                      confidence: d.confidence || 0,
                      reasoning: d.reasoning || '',
                      updated_at: d.updated_at || new Date().toISOString()
                    }))}
                    patientName={selectedUser?.first_name || 'You'}
                    patientId={selectedUser?.id || ''}
                    conversationId={currentConversation}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <UserSelectionGuide
                hasUsers={users.length > 0}
                hasSelectedUser={!!selectedUser}
                title="Start Your AI Health Chat"
                description="Select a patient above to begin an intelligent health conversation with our AI assistant"
              />
            </div>
          ) : (
            <>
              {/* Messages - Improved spacing */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Token Timeout Notification - Show prominently in chat */}
                <SimpleTokenTimeoutNotification />
                
                {messages.map((message) => (
                  <div key={message.id} className="mb-4">
                    <ChatMessage
                      message={message}
                    />
                    
                    {/* Show analysis notifications after AI messages */}
                    {message.type === 'ai' && messageAnalysis[message.id] && (
                      <ChatAnalysisNotification
                        results={messageAnalysis[message.id].results || {}}
                        onResultsProcessed={() => {
                          setMessageAnalysis(prev => {
                            const { [message.id]: removed, ...rest } = prev;
                            return rest;
                          });
                        }}
                        className="mt-2"
                      />
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted px-4 py-3 rounded-2xl shadow-sm">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Stacked Input Area */}
              <div className="border-t bg-background p-4 space-y-3">
                {/* Pending Image Preview */}
                {pendingImageUrl && (
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Image attached</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingImageUrl(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <img 
                      src={pendingImageUrl} 
                      alt="Pending upload" 
                      className="max-w-full max-h-32 rounded object-cover"
                    />
                  </div>
                )}
                
                {/* Textarea - Full Width */}
                <Textarea
                  placeholder={
                    !selectedUser 
                      ? "Select a patient to start chatting..." 
                      : isInTimeout 
                        ? "🤖 DrKnowsIt is taking a 30-minute break..." 
                        : "Describe your symptoms or ask a health question..."
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[4rem] max-h-32 resize-none text-base border-2 focus:border-primary/50 transition-colors"
                  style={{ fontSize: '16px' }}
                  disabled={!selectedUser || isInTimeout}
                />
                
                {/* Action Buttons Row */}
                <div className="flex items-center gap-2">
                  {/* Image Upload Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={!selectedUser || isUploading || isInTimeout}
                    className="h-11 w-11 p-0"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </Button>
                  
                  {/* Microphone Button */}
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleRecording}
                    disabled={!selectedUser || isProcessing || isInTimeout}
                    className="h-11 w-11 p-0"
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                  
                  {/* Send Button - Primary and Larger */}
                  <Button 
                    onClick={handleSendMessage}
                    disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser || isInTimeout}
                    size="default"
                    className="flex-1 h-11 gap-2"
                  >
                    <Send className="h-5 w-5" />
                    <span className="font-medium">Send</span>
                  </Button>
                </div>
                
                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing voice recording...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Medical Image Confirmation Modal */}
      <MedicalImageConfirmationModal
        isOpen={currentPrompt?.isVisible || false}
        onClose={closeImagePrompt}
        searchTerm={currentPrompt?.searchTerm || ''}
        images={currentPrompt?.images || []}
        onFeedback={(imageId, matches, searchTerm) => 
          handleImageFeedback(imageId, matches, searchTerm, currentConversation, selectedUser?.id)
        }
        loading={imagePromptLoading}
        intent={currentPrompt?.intent}
        aiSuggestion={currentPrompt?.aiSuggestion}
      />
    </SubscriptionGate>
  );
};