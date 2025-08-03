import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Mic, MicOff, Bot, UserIcon, Loader2, MessageCircle, Users, ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers, User } from '@/hooks/useUsers';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { UserSelector } from './UserSelector';
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { TierStatus } from './TierStatus';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { MobileChatInterface } from './MobileChatInterface';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ChatMessage } from './ChatMessage';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatInterfaceWithUsersProps {
  onSendMessage?: (message: string) => void;
  isMobile?: boolean;
  selectedUser?: User | null;
}

export const ChatInterfaceWithUsers = ({ onSendMessage, isMobile = false, selectedUser: propSelectedUser }: ChatInterfaceWithUsersProps) => {
  const { user } = useAuth();
  const { users, selectedUser: hookSelectedUser, setSelectedUser, loading: usersLoading } = useUsers();
  
  // Use prop user if provided, otherwise use hook user
  const selectedUser = propSelectedUser !== undefined ? propSelectedUser : hookSelectedUser;
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
  const [activeTab, setActiveTab] = useState('chat');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
      // Call AI service here
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
      onSendMessage?.(currentInput);
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
    
    try {
      const newConversationId = await createConversation(
        `Chat with ${selectedUser.first_name}`, 
        selectedUser.id
      );
      
      if (newConversationId) {
        await selectConversation(newConversationId);
      }
      
      setActiveTab('chat');
    } catch (error) {
      console.error('Error creating new conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUserSelect = (user: User | null) => {
    setSelectedUser(user);
    if (user) {
      // Create or switch to conversation for this user
      handleNewConversation();
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
      <MobileChatInterface 
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
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[80%] space-x-3 ${
                          message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
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
                          className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden ${
                            message.type === 'user'
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
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

            <div className="border-t p-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Describe your symptoms..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[50px] max-h-[120px] resize-none pr-20"
                    disabled={!selectedUser}
                  />
                  {/* Buttons positioned inside the textarea */}
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <label htmlFor="image-upload-patients" className="cursor-pointer">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!selectedUser || isUploading}
                        className="h-7 w-7 p-0 hover:bg-muted"
                        asChild
                      >
                        <span>
                          {isUploading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ImagePlus className="h-3 w-3" />
                          )}
                        </span>
                      </Button>
                    </label>
                    <input
                      id="image-upload-patients"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
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
                  disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser}
                  className="h-[50px] px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Probable Diagnoses */}
        <div className="w-80">
          {selectedUser ? (
            <ProbableDiagnoses 
              diagnoses={selectedUser.probable_diagnoses || []}
              patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
              patientId={selectedUser.id}
            />
          ) : (
            <div className="p-6 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Probable Diagnoses</h3>
              <p className="text-sm text-muted-foreground">
                Select a user to view their probable diagnoses based on conversation history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Backward compatibility
export const ChatInterfaceWithPatients = ChatInterfaceWithUsers;