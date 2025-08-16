import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, History, ChevronDown, ChevronUp, Users, X, ImagePlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers, User } from '@/hooks/useUsers';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useSubscription } from '@/hooks/useSubscription';
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { UserSelectionGuide } from './UserSelectionGuide';
import { SubscriptionGate } from './SubscriptionGate';
import { ChatMessage } from './ChatMessage';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showDiagnoses, setShowDiagnoses] = useState(false);
  const [patientSelectorCollapsed, setPatientSelectorCollapsed] = useState(true);
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

      const aiResponse = data.response || 'I apologize, but I am unable to process your request at the moment.';

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

      // Call separate diagnosis analysis (background)
      const recentMessages = [...messages, 
        { type: 'user', content: messageContent },
        { type: 'ai', content: aiResponse }
      ].slice(-6);

      supabase.functions.invoke('analyze-conversation-diagnosis', {
        body: {
          conversation_id: conversationId,
          patient_id: selectedUser.id,
          recent_messages: recentMessages
        }
      }).catch(error => {
        console.error('Error analyzing conversation for diagnosis:', error);
      });
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
    <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start conversations with our AI health assistant with a Pro subscription.">
      <div className="h-full flex flex-col bg-background">
        {/* Collapsible Patient Selector */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
          <div className="p-3">
            <button
              onClick={() => setPatientSelectorCollapsed(!patientSelectorCollapsed)}
              className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg transition-all hover:bg-muted/70"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Select Patient'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUser ? 'Currently chatting with' : 'Choose who to chat with'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sheet open={showHistory} onOpenChange={setShowHistory}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <History className="h-4 w-4" />
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
                
                {patientSelectorCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {!patientSelectorCollapsed && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                <UserDropdown
                  users={users}
                  selectedUser={selectedUser}
                  onUserSelect={handleUserSelect}
                  open={false}
                  onOpenChange={() => {}}
                />
                
                {/* Topics to Discuss - Always visible */}
                <div className="w-full">
                  <div className="p-3 bg-background border rounded-lg">
                    <ProbableDiagnoses 
                      diagnoses={selectedUser && selectedUser.probable_diagnoses ? selectedUser.probable_diagnoses : []}
                      patientName={selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'No Patient Selected'}
                      patientId={selectedUser?.id || ''}
                    />
                  </div>
                </div>
              </div>
            )}
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
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {messages.map((message) => (
                   <ChatMessage key={message.id} message={message} />
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

              {/* Enhanced Input Area */}
              <div className="border-t bg-background/95 backdrop-blur p-4 space-y-3">
              {pendingImageUrl && (
                <div className="mb-3 p-2 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-sm font-medium">Image attached</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingImageUrl(null)}
                      className="h-6 w-6 p-0 ml-auto"
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
              
              <div className="relative">
                <Textarea
                  placeholder="Describe your symptoms or ask a health question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[3rem] max-h-32 resize-none border-2 focus:border-primary/50 transition-colors pr-32"
                  disabled={!selectedUser}
                />
                
                {/* Buttons positioned inside the textarea */}
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!selectedUser || isUploading}
                      className="h-8 w-8 p-0 hover:bg-muted"
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
                    id="image-upload"
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
                    className="h-8 w-8 p-0 hover:bg-muted"
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
                    className="h-8 w-8 p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
                
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
    </SubscriptionGate>
  );
};