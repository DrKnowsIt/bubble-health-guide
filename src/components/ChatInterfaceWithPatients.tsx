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
import { useSubscription } from '@/hooks/useSubscription';
import { UserSelector } from './UserSelector';
import HealthInsightsPanel from './HealthInsightsPanel';
import { TierStatus } from './TierStatus';
import { ConversationHistory } from './ConversationHistory';
import { UserDropdown } from './UserDropdown';
import { MobileEnhancedChatInterface } from './MobileEnhancedChatInterface';
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
  const { subscribed } = useSubscription();
  
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
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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

    // Validate conversation belongs to current patient
    if (currentConversation) {
      const currentConv = conversations.find(c => c.id === currentConversation);
      if (!currentConv) {
        console.log('[ChatInterface] Current conversation not found in conversations list, forcing new conversation');
        startNewConversation();
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

      const rawResponse = data.response || 'I apologize, but I am unable to process your request at the moment.';
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
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(conversationId, 'ai', aiMessage.content);
      onSendMessage?.(currentInput);

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
    console.log('[ChatInterface] User selection changed:', user ? `${user.first_name} ${user.last_name} (${user.id})` : 'null');
    
    // Immediately clear all conversation-related state to prevent cross-user contamination
    setMessages([]);
    setInputValue('');
    setPendingImageUrl(null);
    
    // Force conversation reset when switching users to avoid context mixing
    startNewConversation();
    
    // Clear any pending requests to prevent stale responses
    requestSeqRef.current += 1;
    convAtRef.current = null;
    setIsTyping(false);
    
    // Set the new user which will trigger useConversations to fetch new data
    setSelectedUser(user);
    
    console.log('[ChatInterface] Complete state reset for user switch:', {
      newUser: user ? `${user.first_name} ${user.last_name}` : 'none',
      messagesCleared: true,
      conversationReset: true
    });
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
                    <ChatMessage
                      key={message.id}
                      message={message}
                    />
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
                    disabled={!selectedUser || !subscribed}
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
                  disabled={(!inputValue.trim() && !pendingImageUrl) || isTyping || !selectedUser || !subscribed}
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
          <HealthInsightsPanel 
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