import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, History, Users, Brain, ChevronDown, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers, User } from '@/hooks/useUsers';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useSubscription } from '@/hooks/useSubscription';
import EnhancedHealthInsightsPanel from './EnhancedHealthInsightsPanel';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { UserSelectionGuide } from './UserSelectionGuide';
import { SubscriptionGate } from './SubscriptionGate';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMedicalImagePrompts } from '@/hooks/useMedicalImagePrompts';
import { MedicalImageConfirmationModal } from '@/components/MedicalImageConfirmationModal';
import { ChatMessage } from './ChatMessage';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const { users, selectedUser: hookSelectedUser, setSelectedUser, loading: usersLoading } = useUsers();
  
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
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [activeAssessmentTab, setActiveAssessmentTab] = useState('diagnoses');
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
        .replace(/\[IMAGE_SUGGESTION:[\s\S]*?\]/gi, '') // Remove image suggestion from display
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
      if (data.imageSuggestion) {
        await triggerImagePrompt(currentInput, data.imageSuggestion);
      } else {
        await triggerImagePrompt(currentInput);
      }

      // Background analysis for diagnoses and solutions (fire-and-forget)
      if (user && conversationId && selectedUser?.id) {
        const recentMessages = [...messages, userMessage, aiMessage].slice(-6);
        
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
      <div className="h-full flex bg-background overflow-hidden">
        {/* Main Chat Area - Two Column Layout for Tablet */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Header with Patient Selection and Controls */}
          <div className="border-b bg-background/95 backdrop-blur p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Select Patient'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedUser ? 'Currently chatting with' : 'Choose who to chat with'}
                  </div>
                </div>
              </div>
              
              <UserDropdown
                users={users}
                selectedUser={selectedUser}
                onUserSelect={handleUserSelect}
                open={false}
                onOpenChange={() => {}}
              />
            </div>
            
            <div className="flex items-center gap-3">
              {/* History Sheet */}
              <Sheet open={showHistory} onOpenChange={setShowHistory}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    History
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-96">
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
            </div>
          </div>

          {/* Chat Messages - Main content area */}
          <div className="flex-1 flex min-h-0">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {!selectedUser ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <UserSelectionGuide
                    hasUsers={users.length > 0}
                    hasSelectedUser={!!selectedUser}
                    title="Start Your AI Health Chat"
                    description="Select a patient to begin an intelligent health conversation with our AI assistant"
                  />
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[85%] gap-3 ${
                            message.type === 'user' ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                              message.type === 'user' 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {message.type === 'user' ? (
                              <UserIcon className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden shadow-sm ${
                              message.type === 'user'
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Bot className="h-5 w-5" />
                          </div>
                          <div className="bg-muted px-5 py-4 rounded-2xl shadow-sm">
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

                  {/* Input Area */}
                  <div className="border-t bg-background/95 backdrop-blur p-4 flex-shrink-0">
                    <div className="relative">
                      <Textarea
                        placeholder="Describe your symptoms or ask a health question..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="min-h-[3.5rem] max-h-40 resize-none border-2 focus:border-primary/50 transition-colors text-base pr-40"
                        disabled={!selectedUser}
                      />
                      
                      {/* Buttons positioned inside the textarea */}
                      <div className="absolute right-3 bottom-3 flex gap-2">
                        <label htmlFor="image-upload-tablet" className="cursor-pointer">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!selectedUser || isUploading}
                            className="h-9 w-9 p-0 hover:bg-muted"
                            asChild
                          >
                            <span>
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ImagePlus className="h-4 w-4" />
                              )}
                            </span>
                          </Button>
                        </label>
                        <input
                          id="image-upload-tablet"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          variant={isRecording ? "destructive" : "ghost"}
                          size="sm"
                          onClick={toggleRecording}
                          disabled={!selectedUser || isProcessing}
                          className="h-9 w-9 p-0 hover:bg-muted"
                        >
                          {isRecording ? (
                            <MicOff className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          onClick={handleSendMessage}
                          disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser}
                          size="sm"
                          className="h-9 w-9 p-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {isProcessing && (
                      <div className="flex items-center justify-center text-sm text-muted-foreground mt-3">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing voice recording...
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Assessment Side Panel - Responsive width for tablets */}
            <div className="w-64 xl:w-72 border-l bg-background flex flex-col min-h-0 flex-shrink-0">
              <div className="p-3 border-b flex-shrink-0">
                <h3 className="font-medium flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-primary" />
                  Health Assessment
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <EnhancedHealthInsightsPanel 
                  diagnoses={selectedUser && selectedUser.probable_diagnoses ? selectedUser.probable_diagnoses : []}
                  patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'No Patient Selected'}
                  patientId={selectedUser?.id || ''}
                  conversationId={currentConversation}
                />
              </div>
            </div>
          </div>
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