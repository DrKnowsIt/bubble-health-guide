import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, History, Users, BarChart3, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsersQuery, User } from '@/hooks/optimized/useUsersQuery';
import { useConversationsQuery, Message } from '@/hooks/optimized/useConversationsQuery';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useSubscription } from '@/hooks/useSubscription';
import EnhancedHealthInsightsPanel from '../health/EnhancedHealthInsightsPanel';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from '../UserDropdown';
import { UserSelectionGuide } from '../UserSelectionGuide';
import { SubscriptionGate } from '../SubscriptionGate';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMedicalImagePrompts } from '@/hooks/useMedicalImagePrompts';
import { MedicalImageConfirmationModal } from '../modals/MedicalImageConfirmationModal';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TabletChatInterfaceProps {
  selectedUser?: User | null;
  onUserSelect?: (user: User | null) => void;
}

export const TabletChatInterface = ({ 
  selectedUser: propSelectedUser, 
  onUserSelect 
}: TabletChatInterfaceProps) => {
  const { user } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { users, selectedUser: hookSelectedUser, setSelectedUser, loading: usersLoading } = useUsersQuery();
  
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
  const [showAssessment, setShowAssessment] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stale reply guard
  const requestSeqRef = useRef(0);
  const convAtRef = useRef<string | null>(currentConversation);

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

  const { 
    currentPrompt, 
    loading: imagePromptLoading, 
    triggerImagePrompt, 
    handleImageFeedback, 
    closeImagePrompt 
  } = useMedicalImagePrompts();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Invalidate in-flight requests when conversation changes
  useEffect(() => {
    convAtRef.current = currentConversation;
    requestSeqRef.current += 1;
    setIsTyping(false);
  }, [currentConversation]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingImageUrl) || !selectedUser) return;

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
        .replace(/\[IMAGE_SUGGESTION:[\s\S]*?\]/gi, '')
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
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(conversationId, 'ai', aiMessage.content);
      
      // Check for AI image suggestion or trigger based on user message
      const recentContext = [...messages, userMessage].slice(-4).map(msg => 
        `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      );
      
      // Only trigger image prompts for human patients, not pets
      if (!selectedUser?.is_pet) {
        if (data.imageSuggestion) {
          await triggerImagePrompt(currentInput, data.imageSuggestion, recentContext);
        } else {
          await triggerImagePrompt(currentInput, undefined, recentContext);
        }
      }

      // Background analysis for diagnoses and solutions (fire-and-forget)
      if (user && conversationId && selectedUser?.id) {
        const recentMessages = [...messages, userMessage, aiMessage];
        
        // Background diagnosis analysis (fire-and-forget)
        supabase.functions.invoke('analyze-conversation-diagnosis', {
          body: {
            conversation_id: conversationId,
            patient_id: selectedUser.id,
            recent_messages: recentMessages
          }
        }).catch(error => {
          console.error('Error analyzing conversation for diagnosis:', error);
        });

        // Background solution analysis (fire-and-forget)
        supabase.functions.invoke('analyze-conversation-solutions', {
          body: {
            conversation_id: conversationId,
            patient_id: selectedUser.id,
            recent_messages: recentMessages
          }
        }).catch(error => {
          console.error('Error analyzing conversation for solutions:', error);
        });

        // Background memory analysis (fire-and-forget)
        supabase.functions.invoke('analyze-conversation-memory', {
          body: {
            conversation_id: conversationId,
            patient_id: selectedUser.id,
          }
        }).catch(error => {
          console.error('Error analyzing conversation for memory:', error);
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (reqId !== requestSeqRef.current || convAtRef.current !== convoAtSend) {
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

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start unlimited conversations with our advanced AI health assistant. Get personalized insights, symptom analysis, and health recommendations with a Basic or Pro subscription.">
      <div className="h-full flex flex-col bg-background relative">
        {/* Responsive Tablet Header */}
        <div className="tablet-header border-b bg-card/95 backdrop-blur-sm flex-shrink-0 shadow-sm">
          <div className="tablet-header-container">
            {/* User Info Section */}
            <div className="tablet-user-section">
              <div className="tablet-avatar">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="tablet-user-info">
                <div className="tablet-user-name">
                  {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Select Patient'}
                </div>
                {selectedUser && (
                  <div className="tablet-user-subtitle">AI Health Assistant</div>
                )}
              </div>
            </div>
            
            {/* Patient Selection */}
            <div className="tablet-dropdown-container">
              <UserDropdown
                users={users}
                selectedUser={selectedUser}
                onUserSelect={handleUserSelect}
                open={false}
                onOpenChange={() => {}}
              />
            </div>
            
            {/* Action Button */}
            <div className="tablet-action-section">
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => setShowHistory(true)}
                className="tablet-action-button"
              >
                <History className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Chat Area - Always fill available space */}
        <div className="flex flex-col flex-1 min-h-0">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <UserSelectionGuide
                hasUsers={users.length > 0}
                hasSelectedUser={!!selectedUser}
                title="Start Your AI Health Chat"
                description="Select a patient to begin an intelligent health conversation with our AI assistant"
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Ready to help with your health</h3>
                  <p className="text-muted-foreground mt-2">Start a conversation by describing your symptoms or health concerns below.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="tablet-messages-container">
                {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`tablet-message-row ${
                          message.type === 'user' ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full flex-shrink-0 shadow-sm ${
                            message.type === 'user' 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-card border text-muted-foreground"
                          }`}
                        >
                          {message.type === 'user' ? (
                            <UserIcon className="h-5 w-5" />
                          ) : (
                            <Bot className="h-5 w-5" />
                          )}
                        </div>
                        <div
                          className={`px-6 py-4 rounded-3xl max-w-full overflow-hidden shadow-sm border ${
                            message.type === 'user'
                              ? "bg-primary text-primary-foreground border-primary/20" 
                              : "bg-card text-card-foreground border-border/50"
                          }`}
                        >
                          <p className="text-base whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card border text-muted-foreground shadow-sm">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="bg-card border border-border/50 px-6 py-4 rounded-3xl shadow-sm">
                          <div className="flex space-x-2">
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

              {/* Tablet Input Area */}
              <div className="tablet-input-area">
                <div className="tablet-input-container">
                  <div className="relative bg-background rounded-2xl border shadow-lg overflow-hidden">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Describe your symptoms or ask health questions..."
                      className="min-h-[64px] max-h-32 resize-none border-0 bg-transparent pr-20 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
                      disabled={isTyping || !selectedUser}
                    />
                    
                    {pendingImageUrl && (
                      <div className="m-4 mb-2 relative inline-block">
                        <img 
                          src={pendingImageUrl} 
                          alt="Uploaded" 
                          className="h-24 w-24 object-cover rounded-xl border shadow-sm"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0 shadow-lg"
                          onClick={() => setPendingImageUrl(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                      <div className="flex items-center gap-3">
                        {/* Voice Recording */}
                        <Button
                          type="button"
                          variant={isRecording ? "destructive" : "ghost"}
                          size="lg"
                          onClick={toggleRecording}
                          disabled={isTyping || !selectedUser}
                          className="h-12 w-12 p-0 rounded-full transition-all duration-200 touch-manipulation"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : isRecording ? (
                            <MicOff className="h-5 w-5" />
                          ) : (
                            <Mic className="h-5 w-5" />
                          )}
                        </Button>

{/* Image upload temporarily disabled */}
                      </div>

                      {/* Send Button */}
                      <Button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser}
                        size="lg"
                        className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg touch-manipulation"
                      >
                        {isTyping ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Floating Health Assessment Button */}
        {selectedUser && (
          <div className="fixed bottom-6 right-6 z-20">
            <Button
              onClick={() => setShowAssessment(true)}
              size="lg"
              className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-xl border-4 border-background/80 backdrop-blur-sm transition-all duration-200 touch-manipulation"
            >
              <BarChart3 className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* History Bottom Sheet */}
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t shadow-2xl">
            <SheetHeader className="pb-6 border-b">
              <SheetTitle className="text-xl font-semibold">Conversation History</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden pt-6">
              <ConversationHistory
                selectedPatientId={selectedUser?.id}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
                activeConversationId={currentConversation}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Health Assessment Bottom Sheet */}
        <Sheet open={showAssessment} onOpenChange={setShowAssessment}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t shadow-2xl">
            <SheetHeader className="pb-6 border-b">
              <SheetTitle className="text-xl font-semibold flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-primary" />
                Health Assessment
              </SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-hidden pt-6">
              <EnhancedHealthInsightsPanel 
                diagnoses={[]}
                patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : ''}
                patientId={selectedUser?.id || ''}
                conversationId={currentConversation}
              />
            </div>
          </SheetContent>
        </Sheet>
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