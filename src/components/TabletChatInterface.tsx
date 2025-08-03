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
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { UserSelectionGuide } from './UserSelectionGuide';
import { SubscriptionGate } from './SubscriptionGate';
import { useImageUpload } from '@/hooks/useImageUpload';
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
    saveMessage 
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [activeAssessmentTab, setActiveAssessmentTab] = useState('diagnoses');
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <SubscriptionGate requiredTier="basic" feature="AI Chat" description="Start conversations with our AI health assistant using a Basic or Pro subscription.">
      <div className="h-full flex bg-background">
        {/* Main Chat Area - Two Column Layout for Tablet */}
        <div className="flex-1 flex flex-col">
          {/* Header with Patient Selection and Controls */}
          <div className="border-b bg-background/95 backdrop-blur p-4 flex items-center justify-between">
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
              {/* Assessment Panel Toggle */}
              {selectedUser && selectedUser.probable_diagnoses && selectedUser.probable_diagnoses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssessment(!showAssessment)}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Assessment
                  <Badge variant="secondary" className="ml-1">
                    {selectedUser.probable_diagnoses.length}
                  </Badge>
                </Button>
              )}
              
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

          {/* Chat Messages */}
          <div className="flex-1 flex">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
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
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[75%] gap-4 ${
                            message.type === 'user' ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                              message.type === 'user' 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {message.type === 'user' ? (
                              <UserIcon className="h-5 w-5" />
                            ) : (
                              <Bot className="h-5 w-5" />
                            )}
                          </div>
                          <div
                            className={`px-5 py-4 rounded-2xl max-w-full overflow-hidden shadow-sm ${
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
                  <div className="border-t bg-background/95 backdrop-blur p-6">
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

            {/* Assessment Side Panel - Slide in from right */}
            {showAssessment && selectedUser && selectedUser.probable_diagnoses && selectedUser.probable_diagnoses.length > 0 && (
              <div className="w-80 border-l bg-background/50 backdrop-blur animate-in slide-in-from-right-full">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Health Assessment
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAssessment(false)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <ProbableDiagnoses 
                    diagnoses={selectedUser.probable_diagnoses}
                    patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    patientId={selectedUser.id}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
};