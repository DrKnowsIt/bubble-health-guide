import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { MedicalDisclaimerModal } from "@/components/MedicalDisclaimerModal";

interface ChatInterfaceWithHistoryProps {
  onSendMessage?: (message: string) => void;
}

export const ChatInterfaceWithHistory = ({ onSendMessage }: ChatInterfaceWithHistoryProps) => {
  const { user } = useAuth();
  const {
    currentConversation,
    messages,
    setMessages,
    createConversation,
    saveMessage
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Check if disclaimer was previously accepted
  useEffect(() => {
    const accepted = localStorage.getItem('medical_disclaimer_accepted');
    const acceptedDate = localStorage.getItem('medical_disclaimer_date');
    
    // Check if disclaimer was accepted within the last 24 hours
    if (accepted && acceptedDate) {
      const acceptedTime = new Date(acceptedDate).getTime();
      const now = new Date().getTime();
      const hoursDiff = (now - acceptedTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        setDisclaimerAccepted(true);
      } else {
        // Disclaimer expired, show again
        localStorage.removeItem('medical_disclaimer_accepted');
        localStorage.removeItem('medical_disclaimer_date');
      }
    }
  }, []);

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
  };

  const handleDisclaimerDecline = () => {
    setShowDisclaimer(false);
    // Could redirect to home page or show alternative content
  };

  const generateConversationTitle = (message: string) => {
    // Generate a title from the first user message (truncate if too long)
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Show disclaimer if not accepted
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // If user is authenticated and no current conversation, create one
    let conversationId = currentConversation;
    if (user && !currentConversation) {
      const title = generateConversationTitle(inputValue);
      conversationId = await createConversation(title);
    }

    // Save user message if authenticated
    if (user && conversationId) {
      await saveMessage(conversationId, 'user', inputValue);
    }

    setInputValue('');
    setIsTyping(true);
    onSendMessage?.(inputValue);

    // Simulate AI response
    setTimeout(async () => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Thank you for your question. While I can provide general health information, I always recommend consulting with a healthcare professional for personalized medical advice. Could you tell me more about your specific concern?",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message if authenticated
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', aiMessage.content);
      }
      
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <MedicalDisclaimerModal 
        isOpen={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />
      <div className="flex-1 flex flex-col">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col shadow-elevated">
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
        <div className="border-t border-border p-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Ask DrKnowItAll about your health concerns..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-12 bg-background border-border focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
                  isVoiceMode && "text-primary"
                )}
              >
                {isVoiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="btn-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Voice Mode Indicator */}
          {isVoiceMode && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-primary">
              <div className="h-2 w-2 bg-primary rounded-full pulse-gentle"></div>
              <span>Voice mode active - speak your question</span>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          This is a demonstration. DrKnowItAll provides general health information only. 
          Always consult healthcare professionals for medical advice.
        </p>
      </div>
    </div>
    </>
  );
};