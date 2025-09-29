import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, Users, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsersQuery, User } from '@/hooks/optimized/useUsersQuery';
import { useConversationsQuery, Message } from '@/hooks/optimized/useConversationsQuery';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useEnhancedHealthTopics } from '@/hooks/useEnhancedHealthTopics';
import { EnhancedHealthTopicsPanel } from '@/components/EnhancedHealthTopicsPanel';
import { useSubscription } from '@/hooks/useSubscription';
import { useAnalysisNotifications } from '@/hooks/useAnalysisNotifications';
import { useConversationStateGuard } from '@/hooks/useConversationStateGuard';
import { ConversationAuthPrompt } from '@/components/ConversationAuthPrompt';
import { UserSelector } from '../UserSelector';
import EnhancedHealthInsightsPanel from '../health/EnhancedHealthInsightsPanel';
import { TierStatus } from '../TierStatus';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from '../UserDropdown';
import { MobileEnhancedChatInterface } from './MobileEnhancedChatInterface';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ChatMessage } from './ChatMessage';
import { ChatAnalysisNotification, AnalysisResult } from '../ChatAnalysisNotification';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTokenTimeout } from '@/hooks/useTokenTimeout';
import { SimpleTokenTimeoutNotification } from './SimpleTokenTimeoutNotification';
import { useQueryClient } from '@tanstack/react-query';

console.log('🔍 [DEBUG] ChatInterfaceWithPatients loaded');

// Debug controls for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugTimeout = {
    trigger: () => {
      const event = new CustomEvent('debugTimeout');
      window.dispatchEvent(event);
    }
  };
}

interface ChatInterfaceWithUsersProps {
  onSendMessage?: (message: string) => void;
  isMobile?: boolean;
  selectedUser?: User | null;
}

export const ChatInterfaceWithUsers = ({ onSendMessage, isMobile = false, selectedUser: propSelectedUser }: ChatInterfaceWithUsersProps) => {
  const { user } = useAuth();
  const { users, selectedUser: hookSelectedUser, setSelectedUser, loading: usersLoading } = useUsersQuery();
  const { subscribed, subscription_tier } = useSubscription();
  
  // Use prop user if provided, otherwise use hook user
  const selectedUser = propSelectedUser !== undefined ? propSelectedUser : hookSelectedUser;

  const { 
    conversations,
    messages, 
    loading: messagesLoading, 
    setMessages,
    currentConversation,
    selectConversation,
    createConversation,
    saveMessage,
    startNewConversation,
    updateConversationTitleIfPlaceholder 
  } = useConversationsQuery(selectedUser);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  // State for analysis tracking per message
  const [messageAnalysis, setMessageAnalysis] = useState<Record<string, any[]>>({});
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stale reply guard
  const requestSeqRef = useRef(0);
  const convAtRef = useRef<string | null>(currentConversation);

  // Analysis notifications
  const {
    pendingAnalysis,
    analysisHistory,
    startAnalysis,
    performDiagnosisAnalysis,
    performSolutionAnalysis,
    performMemoryAnalysis,
    clearPendingAnalysis
  } = useAnalysisNotifications(currentConversation, selectedUser?.id || null);

  // Conversation state protection
  const { 
    saveConversationState, 
    handleConversationError,
    restoreConversationState 
  } = useConversationStateGuard();

  // Token timeout handling
  const { isInTimeout, timeUntilReset, handleTokenLimitError, clearTimeout } = useTokenTimeout();
  
  console.log('🔍 [ChatInterfaceWithPatients] Timeout state:', { isInTimeout, timeUntilReset });
  
  // Debug event listener for testing timeout
  useEffect(() => {
    const handleDebugTimeout = () => {
      console.log('🧪 [DEBUG] Forcing timeout state');
      handleTokenLimitError({ timeout_end: Date.now() + 5 * 60 * 1000 });
    };
    
    window.addEventListener('debugTimeout', handleDebugTimeout);
    return () => window.removeEventListener('debugTimeout', handleDebugTimeout);
  }, [handleTokenLimitError]);

  // Debug function to test token timeout (only in development)
  const testTokenTimeout = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 [DEBUG] Simulating token timeout');
      handleTokenLimitError({
        status: 429,
        message: 'Token limit exceeded',
        timeout_end: Date.now() + 5 * 60 * 1000 // 5 minutes from now
      });
    }
  };


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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-save conversation state before navigation or when important changes happen
  useEffect(() => {
    if (user && currentConversation && selectedUser) {
      const conversationState = {
        conversationId: currentConversation,
        selectedUserId: selectedUser.id,
        lastActivity: Date.now(),
        messages: messages
      };
      
      saveConversationState(conversationState);
    }
  }, [currentConversation, selectedUser, messages, saveConversationState, user]);

    // Auto-migrate orphaned conversations to episodes on first load
    useEffect(() => {
      const migrateOrphanedConversations = async () => {
        if (!user) return;
        
        try {
          const { data } = await supabase.functions.invoke('migrate-conversations-to-episodes');
          if (data?.migrated > 0) {
            console.log(`Migrated ${data.migrated} conversations to episodes`);
            toast({
              title: "Chat History Updated",
              description: `We've organized ${data.migrated} of your previous conversations into health episodes for better tracking.`,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error('Migration error:', error);
          // Don't show error to user as this is a background operation
        }
      };
      
      // Only run once per session
      const hasRunMigration = sessionStorage.getItem('conversations_migrated');
      if (!hasRunMigration && user) {
        migrateOrphanedConversations();
        sessionStorage.setItem('conversations_migrated', 'true');
      }
    }, [user]);

  // Simplified: Clear all chat state immediately when user changes
  useEffect(() => {
    console.log('🔄 [ChatInterface] User changed:', { 
      userId: selectedUser?.id, 
      prevMessages: messages?.length || 0 
    });
    
    if (!selectedUser) {
      console.log('🚫 [ChatInterface] No user selected, clearing all state');
      setMessages([]);
      startNewConversation();
      setMessageAnalysis({});
      setInputValue('');
      setPendingImageUrl(null);
    }
  }, [selectedUser?.id]); // Only depend on user ID change

  // Clear state when conversations change and user has no conversations
  useEffect(() => {
    if (selectedUser && conversations !== undefined && conversations.length === 0 && messages.length > 0) {
      console.log('✅ [ChatInterface] User has no conversations but messages exist, clearing');
      setMessages([]);
      startNewConversation();
      setMessageAnalysis({});
      setInputValue('');
      setPendingImageUrl(null);
    }
  }, [conversations, selectedUser, messages.length]);

  // Invalidate in-flight requests when conversation changes
  useEffect(() => {
    convAtRef.current = currentConversation;
    requestSeqRef.current += 1;
    setIsTyping(false);
  }, [currentConversation]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || !selectedUser) return;

    // Validate conversation belongs to current patient
    if (currentConversation) {
      const currentConv = conversations.find(c => c.id === currentConversation);
      if (!currentConv) {
        console.log('[ChatInterface] Current conversation not found in conversations list, forcing new conversation');
        startNewConversation();
      } else {
        // Additional validation: ensure conversation belongs to current selected user
        const belongsToCurrentUser = currentConv.patient_id === selectedUser.id;
        if (!belongsToCurrentUser) {
          console.error('[ChatInterface] SECURITY ISSUE: Current conversation belongs to different user! Clearing conversation.');
          console.error('[ChatInterface] Conversation patient_id:', currentConv.patient_id, 'Selected user id:', selectedUser.id);
          startNewConversation();
          toast({
            title: "Session Reset",
            description: "Your chat session has been reset for security reasons.",
            variant: "default"
          });
          return;
        }
      }
    }

    const messageContent = inputValue.trim() || (pendingImageUrl ? "I've uploaded an image for you to analyze." : "");
    const imageUrl = pendingImageUrl || undefined;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      image_url: imageUrl
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageContent;
    setInputValue('');
    setPendingImageUrl(null);

    // Ensure conversation exists and belongs to current patient
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
          message: currentInput,
          conversation_history: conversationHistory,
          patient_id: selectedUser.id,
          user_id: user.id,
          conversation_id: conversationId,
          image_url: imageUrl
        }
      });

      if (error) throw error;

      const rawResponse = data.message || 'I apologize, but I am unable to process your request at the moment.';
      const cleanResponse = rawResponse
        .replace(/\{[\s\S]*?"diagnosis"[\s\S]*?\}/gi, '')
        .replace(/\{[\s\S]*?"suggested_forms"[\s\S]*?\}/gi, '')
        .replace(/\[[\s\S]*?\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/,\s+\./g, '.')
        .trim();

      // Guard against stale responses
      if (reqId !== requestSeqRef.current || convAtRef.current !== convoAtSend) {
        return;
      }
      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'ai',
        content: cleanResponse,
        timestamp: new Date(),
        products: data.products || undefined
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(conversationId, 'ai', aiMessage.content, undefined, aiMessage.products);
      onSendMessage?.(currentInput);

        // Background analysis - run separately without affecting main chat flow
        if (user && conversationId && selectedUser?.id) {
          // Delay to ensure typing state is properly managed and avoid interference
          setTimeout(async () => {
            // Fetch fresh messages from database to ensure consistency
            const { data: freshMessages } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })
              .limit(10);
            
            const recentMessages = (freshMessages || []).map(msg => ({ // Use full conversation instead of slice(-6)
              type: msg.type,
              content: msg.content,
              timestamp: new Date(msg.created_at)
            }));
            
            const messageId = aiMessage.id;
        
            console.log('[ChatInterface] Starting background analysis for message:', messageId);
        
            // Initialize analysis state for this message
            setMessageAnalysis(prev => ({
              ...prev,
              [messageId]: [
                { type: 'diagnosis', status: 'loading' },
                { type: 'solution', status: 'loading' },
                { type: 'memory', status: 'loading' }
              ]
            }));
        
            // Run all analyses in parallel with proper tracking
            Promise.allSettled([
              performDiagnosisAnalysis(conversationId, selectedUser.id, recentMessages)
                .then(result => {
                  console.log('[ChatInterface] Diagnosis analysis result:', result);
                  setMessageAnalysis(prev => ({
                    ...prev,
                    [messageId]: prev[messageId]?.map(r => 
                      r.type === 'diagnosis' ? result : r
                    ) || [result]
                  }));
                  return result;
                }),
              
              performSolutionAnalysis(conversationId, selectedUser.id, recentMessages)
                .then(result => {
                  console.log('[ChatInterface] Solution analysis result:', result);
                  setMessageAnalysis(prev => ({
                    ...prev,
                    [messageId]: prev[messageId]?.map(r => 
                      r.type === 'solution' ? result : r
                    ) || [result]
                  }));
                  return result;
                }),
              
              performMemoryAnalysis(conversationId, selectedUser.id)
                .then(result => {
                  console.log('[ChatInterface] Memory analysis result:', result);
                  setMessageAnalysis(prev => ({
                    ...prev,
                    [messageId]: prev[messageId]?.map(r => 
                      r.type === 'memory' ? result : r
                    ) || [result]
                  }));
                  return result;
                })
            ]).then(results => {
              console.log('[ChatInterface] All background analyses complete for message:', messageId, results);
              // Auto-clear after 10 seconds
              setTimeout(() => {
                setMessageAnalysis(prev => {
                  const newState = { ...prev };
                  delete newState[messageId];
                  return newState;
                });
              }, 10000);
            }).catch(error => {
              console.error('[ChatInterface] Background analysis error:', error);
            });
          }, 500); // Shorter delay but still ensures typing state is cleared first
        }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (reqId !== requestSeqRef.current || convAtRef.current !== convoAtSend) {
        return;
      }
      
      // Handle token limit timeout (429 status or token limit message)
      if (error?.status === 429 || error?.message?.includes('token limit')) {
        console.log('🔒 [ChatInterface] Token limit reached, activating timeout');
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

  const handleConversationSelect = async (conversationId: string) => {
    try {
      await selectConversation(conversationId);
      setActiveTab('chat');
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
    setActiveTab('chat');
  };

  const handleUserSelect = (user: User | null) => {
    console.log('🔄 [ChatInterface] handleUserSelect called:', { 
      newUser: user?.id, 
      previousUser: selectedUser?.id 
    });
    
    if (user?.id !== selectedUser?.id) {
      console.log('🚫 [ChatInterface] User changed, clearing all state immediately');
      
      // Clear all state immediately and synchronously before user change
      setMessages([]);
      setMessageAnalysis({});
      setInputValue('');
      setPendingImageUrl(null);
      startNewConversation();
      clearPendingAnalysis();
      
      // Then select the new user
      setSelectedUser(user);
    }
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8">
        <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Users Found</h3>
        <p className="text-muted-foreground mb-4">
          You need to add users before you can start chatting.
        </p>
      </div>
    );
  }

  // Mobile layout - Use new simplified interface
  if (isMobile) {
    return (
      <MobileEnhancedChatInterface 
        selectedUser={selectedUser}
        onUserSelect={handleUserSelect}
      />
    );
  }

  // Desktop layout
  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Tier Status - Desktop */}
      <div className="flex justify-between items-center">
        <TierStatus />
      </div>
      
      <div className="flex-[2] flex space-x-4">
        {/* Left Sidebar - History and User Selection */}
        <div className="w-80 space-y-4">

          {/* Conversation History */}
          <div className="flex-1">
            <ConversationHistory
              selectedPatientId={selectedUser?.id}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              activeConversationId={currentConversation}
            />
          </div>

          {/* Debug controls in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Debug Controls</h4>
              <div className="space-y-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testTokenTimeout}
                  className="w-full text-xs"
                >
                  Test Timeout (5min)
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearTimeout}
                  className="w-full text-xs"
                >
                  Clear Timeout
                </Button>
                <div className="text-xs text-muted-foreground">
                  Timeout: {isInTimeout ? '✅ Active' : '❌ Inactive'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-[600px]">
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[500px]">
              {!selectedUser ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a User</h3>
                    <p className="text-muted-foreground">
                      Choose a user from the dropdown to start chatting.
                    </p>
                  </div>
                </div>
              ) : !user ? (
                <div className="flex items-center justify-center h-full">
                  <ConversationAuthPrompt message="Please sign in to access the chat and your conversation history." />
                </div>
              ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id} className="mb-6">
                        <ChatMessage
                          message={message}
                        />
                        
                         {/* Show analysis notifications after AI messages */}
                         {message.type === 'ai' && messageAnalysis[message.id] && (
                           <ChatAnalysisNotification
                             results={messageAnalysis[message.id]}
                             onResultsProcessed={() => {
                               setMessageAnalysis(prev => {
                                 const newState = { ...prev };
                                 delete newState[message.id];
                                 return newState;
                               });
                             }}
                             className="mt-2"
                           />
                         )}
                      </div>
                    ))}

                    {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="bg-muted px-4 py-3 rounded-2xl">
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
                </>
              )}
            </CardContent>

            {/* Token timeout notification */}
            <SimpleTokenTimeoutNotification />

            {/* Debug controls for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="border-t p-2 bg-muted/50">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={testTokenTimeout}
                    className="text-xs"
                  >
                    Test Timeout (5min)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={clearTimeout}
                    className="text-xs"
                  >
                    Clear Timeout
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t p-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                   <Textarea
                    placeholder="Describe your symptoms..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[50px] max-h-[120px] resize-none pr-20"
                    disabled={!selectedUser || !subscribed || isInTimeout}
                  />
                  {/* Buttons positioned inside the textarea */}
                  <div className="absolute bottom-2 right-2 flex gap-1">
{/* Image upload temporarily disabled */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-muted"
                      onClick={toggleRecording}
                      disabled={!selectedUser || isProcessing}
                    >
                      {isRecording ? (
                        <MicOff className="h-3 w-3 text-red-500" />
                      ) : (
                        <Mic className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser || !subscribed || isInTimeout}
                  className="h-[50px] px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Probable Diagnoses - Always visible */}
        <div className="w-80">
          <EnhancedHealthInsightsPanel 
            diagnoses={selectedUser?.probable_diagnoses || []}
            patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'No Patient Selected'}
            patientId={selectedUser?.id || ''}
            conversationId={currentConversation}
          />
        </div>
      </div>
    </div>
  );
};

// Backward compatibility
export const ChatInterfaceWithPatients = ChatInterfaceWithUsers;