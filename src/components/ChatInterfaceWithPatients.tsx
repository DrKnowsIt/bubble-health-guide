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

    // Check if patient is selected
    if (!selectedPatient) {
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
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show patient selector if no patients
  if (patients.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <PatientSelector className="mb-6" />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto", isMobile ? "h-full flex flex-col" : "max-w-4xl")}>
      {/* Patient Selection - Compact for mobile */}
      <div className={cn(
        "p-4 bg-card rounded-lg border",
        isMobile ? "mb-2 mx-2 mt-2" : "mb-6"
      )}>
        <PatientSelector 
          onPatientSelected={(patient) => {
            // When patient changes, reset the current conversation
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

      {/* Chat Header with New Conversation Button - Hidden on mobile */}
      {!isMobile && (
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
      )}

      {/* Chat Container */}
      <div className={cn(
        "chat-container flex flex-col shadow-elevated",
        isMobile 
          ? "flex-1 mx-2 mb-2 h-[calc(100%-120px)]" 
          : "h-[500px]"
      )}>
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
                      : "gradient-bubble text-white"
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
                    "px-4 py-3 text-sm",
                    message.type === 'user' 
                      ? "chat-bubble-user" 
                      : "chat-bubble-ai chat-bubble-enter"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-bubble text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="chat-bubble-ai px-4 py-3">
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
        <div className={cn(
          "border-t border-border",
          isMobile ? "p-3" : "p-4"
        )}>
          {/* Mobile: New conversation button */}
          {isMobile && user && selectedPatient && (
            <div className="mb-3 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startNewConversation}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Conversation
              </Button>
            </div>
          )}
          
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder={`Ask DrKnowsIt about ${selectedPatient?.first_name || 'your'} health concerns...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className={cn(
                  "pr-12 bg-background border-border focus:ring-2 focus:ring-primary",
                  isMobile && "text-base" // Prevent zoom on iOS
                )}
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
              <span>Voice mode active - speak your question</span>
            </div>
          )}

          {!selectedPatient && (
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Please select a patient to start chatting
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer - Compact for mobile */}
      {!isMobile && (
        <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            DrKnowsIt provides general health information only and may be inaccurate. 
            Always consult healthcare professionals for medical advice. Do not accept AI responses as definitive.
          </p>
        </div>
      )}

    </div>
  );
};