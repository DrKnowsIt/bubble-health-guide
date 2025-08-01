import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Plus, Lock, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { DemoConversation } from "@/components/DemoConversation";

interface ChatInterfaceWithHistoryProps {
  onSendMessage?: (message: string) => void;
  onShowHistory?: () => void;
}

export const ChatInterfaceWithHistory = ({ onSendMessage, onShowHistory }: ChatInterfaceWithHistoryProps) => {
  const { user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    currentConversation,
    messages,
    setMessages,
    createConversation,
    saveMessage,
    startNewConversation
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateConversationTitle = (message: string) => {
    // Generate a title from the first user message (truncate if too long)
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Check if user is logged in and has subscription
    if (!user || !subscribed) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    
    // If user is authenticated and no current conversation, create one FIRST
    let conversationId = currentConversation;
    if (user && !currentConversation) {
      const title = generateConversationTitle(inputValue);
      conversationId = await createConversation(title, null);
      
      if (!conversationId) {
        console.error('Failed to create conversation');
        return;
      }
    }

    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Save user message if authenticated
    if (user && conversationId) {
      await saveMessage(conversationId, 'user', inputValue);
    }

    // Call onSendMessage callback after conversation is created and message is saved
    onSendMessage?.(currentInput);

    try {
      // Prepare conversation history for context (exclude welcome message if present)
      const conversationHistory = messages.filter(msg => msg.id !== 'welcome');
      
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
      
      // Save AI message if authenticated
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', aiMessage.content);
      }
    } catch (error) {
      console.error('Error calling Grok AI:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or check your connection.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Save error message if authenticated
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', errorMessage.content);
      }
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

  // Show demo conversation for logged-out users
  if (!user) {
    return <DemoConversation />;
  }

  // Show upgrade message for logged-in users without subscription
  if (!subscriptionLoading && !subscribed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4 mx-auto">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Upgrade to Chat with DrKnowsIt
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get unlimited access to our AI health assistant, personalized insights, and conversation history.
          </p>
        </div>
        <Button 
          onClick={() => window.location.href = '/pricing'}
          className="mb-4"
        >
          View Pricing Plans
        </Button>
        <p className="text-xs text-muted-foreground">
          Want to see how it works? Check out the demo conversation.
        </p>
      </div>
    );
  }

  // Regular chat interface for subscribed users
  return (
    <div className="flex-1 flex flex-col max-h-full overflow-hidden">
      {/* Chat Header with New Conversation Button */}
      <div className="shrink-0 border-b border-border p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Chat with DrKnowsIt</h2>
        {user && (
          <div className="flex items-center gap-2">
            {onShowHistory && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onShowHistory}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            )}
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
      </div>

      {/* Messages Container with proper constraints */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="p-6 space-y-4">
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
                    "flex max-w-[85%] space-x-3",
                    message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 mt-1",
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
                      "px-4 py-3 text-sm rounded-2xl break-words",
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

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
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

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              placeholder="Describe your symptoms to prepare questions for your doctor..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-base border-0 bg-muted focus:ring-2 focus:ring-primary"
              disabled={!subscribed}
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !subscribed}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Premium AI health assistant - unlimited conversations
        </div>
      </div>
    </div>
  );
};