import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Thank you for your question about "${inputValue}". I can provide general health information to help you understand various topics. However, please remember that I'm an AI assistant and cannot replace professional medical advice. For personalized medical guidance, symptoms diagnosis, or treatment decisions, please consult with a qualified healthcare professional. Is there anything specific you'd like to know more about?`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
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
    <div className="flex flex-col h-full">
      {/* Header with History Tab */}
      <div className="shrink-0 bg-card border-b border-border">
        <div className="flex items-center justify-between p-3">
          <div>
            <h2 className="font-semibold text-lg">DrKnowsIt AI</h2>
            <p className="text-xs text-muted-foreground">General health guidance</p>
          </div>
          {user && onShowHistory && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onShowHistory}
              className="flex items-center gap-1 text-xs"
            >
              <History className="h-3 w-3" />
              History
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 space-y-4">
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

      {/* Input */}
      <div className="shrink-0 bg-card border-t border-border p-4">
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
            className="px-4"
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