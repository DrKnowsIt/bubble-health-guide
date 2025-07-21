import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface SimpleChatInterfaceProps {
  onShowHistory?: () => void;
}

export const SimpleChatInterface = ({ onShowHistory }: SimpleChatInterfaceProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hello! I'm DrKnowsIt, your AI health assistant. Ask me anything about health, symptoms, medications, or general wellness. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.slice(1); // Exclude welcome message
      
      const { data, error } = await supabase.functions.invoke('grok-chat', {
        body: {
          message: currentInput,
          conversation_history: conversationHistory
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || 'I apologize, but I was unable to generate a response. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling Grok AI:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or check your connection.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Messages Container with proper constraints */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="p-3 space-y-3">
            {/* History button for logged in users - floating */}
            {user && onShowHistory && (
              <div className="flex justify-end mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onShowHistory}
                  className="flex items-center gap-1 text-xs"
                >
                  <History className="h-3 w-3" />
                  History
                </Button>
              </div>
            )}
            
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
                      "px-3 py-2 text-sm rounded-2xl break-words",
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
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="shrink-0 bg-card border-t border-border p-3">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Ask about symptoms, medications, health tips..."
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
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {!user && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Sign in to save conversations and access personalized health tracking
          </div>
        )}
      </div>
    </div>
  );
};