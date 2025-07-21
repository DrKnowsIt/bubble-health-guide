import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Bot, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientSelector } from "./PatientSelector";

import { usePatients, Patient } from "@/hooks/usePatients";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceWithPatientsProps {
  onSendMessage?: (message: string) => void;
  isMobile?: boolean;
}

export const ChatInterfaceWithPatients = ({ onSendMessage, isMobile = false }: ChatInterfaceWithPatientsProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { patients, selectedPatient, loading: patientsLoading } = usePatients();
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    createConversation, 
    saveMessage,
    startNewConversation
  } = useConversations();
  const { toast } = useToast();

  const [inputValue, setInputValue] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateConversationTitle = (message: string): string => {
    const words = message.split(' ').slice(0, 6);
    return words.join(' ') + (message.split(' ').length > 6 ? '...' : '');
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // For mobile, create a simple message without patient/conversation management
    if (isMobile && !user) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: inputValue,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsTyping(true);

      // Simple AI response for non-authenticated users
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `Thank you for your question. I can provide general health information, but for personalized advice and to save our conversation, please sign in. Always consult with healthcare professionals for medical decisions.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);

      return;
    }

    // For authenticated users or desktop, use full functionality
    if (!selectedPatient && !isMobile) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient before starting a conversation.",
        variant: "destructive"
      });
      return;
    }

    try {
      let conversationId = currentConversation;

      // Create new conversation if none exists
      if (!conversationId) {
        const title = generateConversationTitle(inputValue);
        conversationId = await createConversation(title, selectedPatient.id);
        if (!conversationId) {
          throw new Error('Failed to create conversation');
        }
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: inputValue,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      await saveMessage(conversationId, 'user', inputValue);
      
      setInputValue('');
      setIsTyping(true);

      // Call the optional onSendMessage callback
      onSendMessage?.(inputValue);

      // Simulate AI response
      setTimeout(async () => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `Thank you for your question about ${selectedPatient.first_name}. While I can provide general health information, I always recommend consulting with a healthcare professional for personalized medical advice. Based on what you've shared, here are some general considerations to discuss with ${selectedPatient.first_name}'s doctor...`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        await saveMessage(conversationId!, 'ai', aiMessage.content);
        setIsTyping(false);
      }, 1500);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading state
  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading patients...</p>
        </div>
      </div>
    );
  }

  // Show patient selector if no patients
  if (patients.length === 0) {
    return (
      <div className="p-4">
        <PatientSelector />
      </div>
    );
  }

  if (isMobile) {
    // Mobile: Clean chat interface
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message */}
          <div className="flex justify-start">
            <div className="flex space-x-3 max-w-[80%]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-sm">Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?</p>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.type === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "flex max-w-[80%] space-x-3",
                  message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary text-white"
                  )}
                >
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "px-4 py-3 text-sm rounded-2xl break-words",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted/50 border border-border rounded-bl-md"
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-[80%]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t bg-background p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask me about your health..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {!user && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Sign in for personalized health tracking and conversation history
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-full flex flex-col">
      {/* Patient Selection - Compact */}
      <div className="shrink-0 mb-4">
        <PatientSelector 
          onPatientSelected={(patient) => {
            if (patient?.id !== selectedPatient?.id) {
              setMessages([{
                id: '1',
                type: 'ai',
                content: `Hello! I'm DrKnowsIt, and I'm here to help with questions about ${patient?.first_name}'s health. I can provide general health information and help you prepare questions for ${patient?.first_name}'s doctor. What would you like to discuss today?`,
                timestamp: new Date()
              }]);
            }
          }}
        />
      </div>

      {/* Chat Container - Full height without card wrapper */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className="shrink-0 p-4 border-b bg-background flex justify-between items-center">
          <h3 className="font-medium">Chat with DrKnowsIt</h3>
          {user && selectedPatient && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewConversation}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          )}
        </div>

        {/* Messages Area - Uses full available space */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.type === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "flex max-w-[75%] space-x-3",
                  message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary text-white"
                  )}
                >
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "px-4 py-3 text-sm rounded-2xl break-words",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted/50 border border-border rounded-bl-md"
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t bg-background p-4">
          <div className="flex space-x-2">
            <Input
              placeholder={`Ask DrKnowsIt about ${selectedPatient?.first_name || 'your'} health concerns...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={!selectedPatient}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !selectedPatient}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {!selectedPatient && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Please select a patient to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};