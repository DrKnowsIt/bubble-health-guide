import { useState, useEffect } from "react";
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
    // Mobile: Super simple chat interface - no patient management, no conversation history
    return (
      <div className="flex flex-col h-full">
        {/* Simple mobile header */}
        <div className="shrink-0 bg-card border-b border-border p-4 text-center">
          <h2 className="font-semibold text-lg">Chat with DrKnowsIt</h2>
          <p className="text-sm text-muted-foreground">Your AI Health Assistant</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 space-y-4">
            {/* Welcome message */}
            <div className="flex justify-start">
              <div className="flex space-x-2 max-w-[85%]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white mt-1 shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2">
                  <p className="text-sm">Hello! I'm DrKnowsIt, your AI health assistant. How can I help you today?</p>
                </div>
              </div>
            </div>
            {/* User messages */}
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
                    "flex max-w-[85%] space-x-2",
                    message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 mt-1",
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary text-white"
                    )}
                  >
                    {message.type === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "px-3 py-2 text-sm rounded-2xl",
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-card border border-border rounded-bl-md"
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
                <div className="flex space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white mt-1">
                    <Bot className="h-3 w-3" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simple mobile input */}
        <div className="shrink-0 bg-card border-t border-border p-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Ask me about your health..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-base border-0 bg-muted focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="sm"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Sign in for personalized health tracking and conversation history
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="max-w-4xl mx-auto">
      {/* Patient Selection */}
      <div className="mb-6 p-4 bg-card rounded-lg border">
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

      {/* Chat Header */}
      <div className="mb-4 p-4 bg-card rounded-lg border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Chat with DrKnowsIt</h2>
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

      {/* Chat Container */}
      <div className="h-[500px] flex flex-col bg-card rounded-lg border shadow-elevated">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
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

                {/* Message Bubble */}
                <div
                  className={cn(
                    "px-4 py-3 text-sm rounded-2xl",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted border border-border rounded-bl-md"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder={`Ask DrKnowsIt about ${selectedPatient?.first_name || 'your'} health concerns...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-12 bg-background border-border focus:ring-2 focus:ring-primary"
                disabled={!selectedPatient}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
                  isVoiceMode && "text-primary"
                )}
                disabled={!selectedPatient}
              >
                {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !selectedPatient}
              className="btn-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Voice Mode Indicator */}
          {isVoiceMode && selectedPatient && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-primary">
              <div className="h-2 w-2 bg-primary rounded-full pulse-gentle"></div>
              <span>Voice mode active</span>
            </div>
          )}

          {!selectedPatient && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Please select a patient to start chatting
            </div>
          )}
        </div>
      </div>

      {/* Desktop disclaimer */}
      <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          DrKnowsIt provides general health information only and may be inaccurate. 
          Always consult healthcare professionals for medical advice.
        </p>
      </div>
    </div>
  );
};