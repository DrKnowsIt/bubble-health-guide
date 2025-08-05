import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Plus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

interface ConsolidatedChatDashboardProps {
  onSendMessage?: (message: string) => void;
}

const examplePrompts = [
  "I have a headache that won't go away",
  "My knee hurts when I walk",
  "I'm feeling chest pain",
  "I have trouble sleeping",
  "I'm experiencing back pain"
];

export const ConsolidatedChatDashboard = ({ onSendMessage }: ConsolidatedChatDashboardProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { selectedUser } = useUsers();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    currentConversation,
    messages,
    setMessages,
    createConversation,
    saveMessage,
    startNewConversation,
    selectConversation,
    deleteConversation
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Load diagnoses for current conversation and patient
  useEffect(() => {
    if (currentConversation && selectedUser?.id && messages.length > 0) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedUser?.id, messages.length]);

  const loadDiagnosesForConversation = async () => {
    try {
      // Load existing diagnoses from database
      const { data, error } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', currentConversation)
        .eq('patient_id', selectedUser?.id)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDiagnoses: Diagnosis[] = (data || []).map(item => ({
        diagnosis: item.diagnosis,
        confidence: item.confidence,
        reasoning: item.reasoning,
        updated_at: item.updated_at
      }));

      setDiagnoses(formattedDiagnoses);
    } catch (error) {
      console.error('Error loading diagnoses:', error);
    }
  };

  const generateDiagnoses = async () => {
    if (!currentConversation || !selectedUser?.id || messages.length === 0) {
      return;
    }

    try {
      // Call the generate-diagnosis edge function
      const { data, error } = await supabase.functions.invoke('generate-diagnosis', {
        body: {
          conversation_id: currentConversation,
          patient_id: selectedUser.id,
          messages: messages
        }
      });

      if (error) throw error;

      // Reload diagnoses from database
      await loadDiagnosesForConversation();
    } catch (error) {
      console.error('Error generating diagnoses:', error);
    }
  };

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const generateConversationTitle = (message: string) => {
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim()) return;
    
    if (!user || !subscribed) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    
    // If user is authenticated and no current conversation, create one FIRST
    let conversationId = currentConversation;
    if (user && !currentConversation) {
      const title = generateConversationTitle(textToSend);
      conversationId = await createConversation(title, selectedUser?.id || null);
      
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
    }

    const currentInput = textToSend;
    if (!messageText) setInputValue(''); // Only clear if using input field
    setIsTyping(true);

    // Save user message if authenticated
    if (user && conversationId) {
      await saveMessage(conversationId, 'user', textToSend);
    }

    // Call onSendMessage callback
    onSendMessage?.(currentInput);

    try {
      // Prepare conversation history for context
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

      // Generate diagnoses after AI response
      setTimeout(async () => {
        await generateDiagnoses();
      }, 1000);
    } catch (error: any) {
      console.error('Error calling Grok AI:', error);
      
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 70) return "High";
    if (confidence >= 50) return "Medium";
    return "Low";
  };

  return (
    <div className="h-full flex gap-4">
      {/* Left Sidebar - Chat History */}
      <div className="w-80 shrink-0 border-r border-border">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat History
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewConversation}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm mt-8">
                <p>No chat history yet</p>
                <p className="mt-2">Start a conversation below</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors text-sm",
                      currentConversation === conversation.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <p className="font-medium truncate">{conversation.title}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center - Main Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className="shrink-0 border-b border-border p-4">
          <h1 className="text-lg font-semibold">Chat with DrKnowsIt</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
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
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-border p-4 space-y-3">
          {/* Example Prompts */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs h-7 px-3"
                  disabled={!subscribed}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder={subscribed ? "Describe your symptoms..." : "Subscribe to start chatting..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-base border-0 bg-muted focus:ring-2 focus:ring-primary"
                disabled={!subscribed}
              />
            </div>
            <Button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || !subscribed}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Topics to Discuss */}
      {selectedUser && currentConversation && diagnoses.length > 0 && (
        <div className="w-80 shrink-0 border-l border-border">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Topics to Discuss</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Preparation topics for {selectedUser.first_name} {selectedUser.last_name}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {diagnoses.map((diagnosis, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm">{diagnosis.diagnosis}</h3>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getConfidenceColor(diagnosis.confidence))}
                      >
                        {getConfidenceLabel(diagnosis.confidence)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${diagnosis.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{diagnosis.confidence}%</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {diagnosis.reasoning}
                    </p>
                    
                    <div className="text-xs text-muted-foreground">
                      {new Date(diagnosis.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};