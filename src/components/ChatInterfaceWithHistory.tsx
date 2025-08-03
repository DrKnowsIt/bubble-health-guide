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
import { useNavigate } from "react-router-dom";

interface ChatInterfaceWithHistoryProps {
  onSendMessage?: (message: string) => void;
  onShowHistory?: () => void;
  onConversationCreated?: () => void; 
}

export const ChatInterfaceWithHistory = ({ onSendMessage, onShowHistory }: ChatInterfaceWithHistoryProps) => {
  const { user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
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
          conversation_history: conversationHistory,
          user_id: user.id,
          conversation_id: conversationId
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
    } catch (error: any) {
      console.error('Error calling Grok AI:', error);
      
      // Enhanced error handling with specific error types
      let errorContent = 'I apologize, but I encountered an error while processing your request.';
      
      if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorContent = 'I\'m having trouble connecting to the server. Please check your internet connection and try again.';
      } else if (error.message?.includes('rate limit')) {
        errorContent = 'I\'m receiving too many requests right now. Please wait a moment and try again.';
      } else if (error.message?.includes('unauthorized')) {
        errorContent = 'Your session may have expired. Please try refreshing the page or logging in again.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: errorContent + ' You can try asking your question again.',
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

  // Show subscription prompt for non-subscribed users but keep interface visible
  const showSubscriptionPrompt = !subscriptionLoading && !subscribed;

  // Regular chat interface with conditional functionality
  return (
    <div className="flex-1 flex flex-col max-h-full overflow-hidden">
      {/* Subscription Alert */}
      {showSubscriptionPrompt && (
        <div className="shrink-0 bg-warning/10 border-b border-warning/20 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-warning">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Subscribe to unlock unlimited AI health consultations and conversation history
            </span>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="ml-2 h-6 px-2 text-xs"
            >
              View Plans
            </Button>
          </div>
        </div>
      )}
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
                className={`flex items-center gap-2 ${!subscribed ? 'opacity-50' : ''}`}
                disabled={!subscribed}
              >
                <History className="h-4 w-4" />
                History
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewConversation}
              className={`flex items-center gap-2 ${!subscribed ? 'opacity-50' : ''}`}
              disabled={!subscribed}
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
              placeholder={subscribed ? "Describe your symptoms to prepare questions for your doctor..." : "Subscribe to start organizing your health questions..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`text-base border-0 bg-muted focus:ring-2 focus:ring-primary ${!subscribed ? 'opacity-50' : ''}`}
              disabled={!subscribed}
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !subscribed}
            size="sm"
            className={`px-3 ${!subscribed ? 'opacity-50' : ''}`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {subscribed 
            ? "Premium AI health assistant - unlimited conversations"
            : "Subscribe to unlock unlimited AI health conversations and history"
          }
        </div>
      </div>
    </div>
  );
};