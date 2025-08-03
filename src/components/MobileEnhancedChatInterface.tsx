import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, History, ChevronDown, ChevronUp, Users, X } from 'lucide-react';
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
    saveMessage 
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showDiagnoses, setShowDiagnoses] = useState(false);
  const [patientSelectorCollapsed, setPatientSelectorCollapsed] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    toggleRecording
  } = useVoiceRecording({
    onTranscription: (text) => setInputValue(text)
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedUser) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      const conversationHistory = messages.filter(msg => msg.id !== 'welcome');
      
      const { data, error } = await supabase.functions.invoke('grok-chat', {
        body: { 
          message: currentInput,
          conversation_history: conversationHistory,
          patient_id: selectedUser?.id,
          user_id: user.id,
          conversation_id: currentConversation 
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'ai',
        content: data.response || 'I apologize, but I am unable to process your request at the moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
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
    
    try {
      const newConversationId = await createConversation(
        `Chat with ${selectedUser.first_name}`, 
        selectedUser.id
      );
      
      if (newConversationId) {
        await selectConversation(newConversationId);
      }
      
      setShowHistory(false);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation. Please try again.",
        variant: "destructive"
      });
    }
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
    <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start conversations with our AI health assistant using a Basic or Pro subscription.">
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
                
                {/* Expandable Diagnoses */}
                {selectedUser && selectedUser.probable_diagnoses && selectedUser.probable_diagnoses.length > 0 && (
                  <Drawer open={showDiagnoses} onOpenChange={setShowDiagnoses}>
                    <DrawerTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg text-left hover:bg-accent/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-accent rounded-full"></div>
                          <span className="text-sm font-medium text-accent">
                            {selectedUser.probable_diagnoses.length} probable condition{selectedUser.probable_diagnoses.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-accent" />
                      </button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>Probable Diagnoses</DrawerTitle>
                      </DrawerHeader>
                      <div className="px-4 pb-4">
                        <ProbableDiagnoses 
                          diagnoses={selectedUser.probable_diagnoses}
                          patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                          patientId={selectedUser.id}
                        />
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
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
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[80%] gap-3 ${
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
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Describe your symptoms or ask a health question..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[3rem] max-h-32 resize-none border-2 focus:border-primary/50 transition-colors"
                      disabled={!selectedUser}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleRecording}
                      disabled={!selectedUser || isProcessing}
                      className="h-10 w-10 p-0 transition-all"
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping || !selectedUser}
                      size="sm"
                      className="h-10 w-10 p-0 transition-all"
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