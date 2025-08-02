import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, History, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers, User } from '@/hooks/useUsers';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { UserSelectionGuide } from './UserSelectionGuide';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MobileChatInterfaceProps {
  selectedUser?: User | null;
  onUserSelect?: (user: User | null) => void;
}

export const MobileChatInterface = ({ selectedUser: propSelectedUser, onUserSelect }: MobileChatInterfaceProps) => {
  const { user } = useAuth();
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showDiagnoses, setShowDiagnoses] = useState(false);
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

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
          <h2 className="text-lg font-semibold">Conversation History</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
            Back to Chat
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationHistory
            selectedPatientId={selectedUser?.id}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            activeConversationId={currentConversation}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with User Selection */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="p-4 space-y-3">
          {/* User Selector */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">Chat with</h2>
              {users.length === 0 ? (
                <div className="text-sm text-muted-foreground">No users found</div>
              ) : (
                <UserDropdown
                  users={users}
                  selectedUser={selectedUser}
                  onUserSelect={handleUserSelect}
                  open={userDropdownOpen}
                  onOpenChange={setUserDropdownOpen}
                />
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowHistory(true)}
              className="ml-3"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>

          {/* Probable Diagnoses - Simplified */}
          {selectedUser && selectedUser.probable_diagnoses && selectedUser.probable_diagnoses.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <button
                onClick={() => setShowDiagnoses(!showDiagnoses)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium">
                    {selectedUser.probable_diagnoses.length} probable condition{selectedUser.probable_diagnoses.length > 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showDiagnoses && "rotate-180")} />
              </button>
              
              {showDiagnoses && (
                <div className="mt-3 pt-3 border-t border-border">
                  <ProbableDiagnoses 
                    diagnoses={selectedUser.probable_diagnoses}
                    patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    patientId={selectedUser.id}
                  />
                </div>
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
              title="Start Chatting"
              description="Select a user from the dropdown above to begin your AI health conversation"
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
                    className={`flex max-w-[85%] space-x-3 ${
                      message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
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
                      className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden ${
                        message.type === 'user'
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Bot className="h-4 w-4" />
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
            </div>

            {/* Input Area */}
            <div className="border-t bg-background/95 backdrop-blur p-4">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Describe your symptoms or ask a health question..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[52px] max-h-[120px] resize-none pr-12 text-base"
                    disabled={!selectedUser}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-2 right-2 h-8 w-8 p-0"
                    onClick={toggleRecording}
                    disabled={!selectedUser || isProcessing}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || !selectedUser}
                  className="h-[52px] px-4 rounded-2xl"
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};