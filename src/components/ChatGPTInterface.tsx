import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProbableDiagnoses } from "@/components/ProbableDiagnoses";
import { ConversationSidebar } from "@/components/ConversationSidebar";

interface ChatGPTInterfaceProps {
  onSendMessage?: (message: string) => void;
}

interface Diagnosis {
  id: string;
  conversation_id: string;
  patient_id: string;
  user_id: string;
  diagnosis: string;
  confidence: number;
  reasoning: string;
  created_at: string;
  updated_at: string;
}

const examplePrompts = [
  "I have a headache that won't go away",
  "My knee hurts when I walk", 
  "I'm feeling chest pain",
  "I have trouble sleeping",
  "I'm experiencing back pain"
];


function ChatInterface({ onSendMessage, conversation }: ChatGPTInterfaceProps & { conversation: { currentConversation: string | null; messages: Message[]; setMessages: Dispatch<SetStateAction<Message[]>>; createConversation: (title: string, patientId?: string | null) => Promise<string | null>; saveMessage: (conversationId: string, type: 'user' | 'ai', content: string, imageUrl?: string) => Promise<void>; } }) {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { selectedUser } = useUsers();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentConversation, messages, setMessages, createConversation, saveMessage } = conversation;
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load diagnoses when conversation or patient changes
  useEffect(() => {
    if (currentConversation && selectedUser?.id) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedUser?.id]);

  const loadDiagnosesForConversation = async () => {
    if (!currentConversation || !selectedUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', currentConversation)
        .eq('patient_id', selectedUser.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading diagnoses:', error);
        return;
      }

      setDiagnoses(data || []);
    } catch (error) {
      console.error('Error loading diagnoses:', error);
    }
  };

  const generateDiagnoses = async () => {
    if (!currentConversation || !selectedUser?.id || !user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagnosis', {
        body: {
          conversation_id: currentConversation,
          patient_id: selectedUser.id,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Error generating diagnoses:', error);
        return;
      }

      if (data?.diagnoses) {
        setDiagnoses(data.diagnoses);
      }
    } catch (error) {
      console.error('Error generating diagnoses:', error);
    }
  };

  const generateConversationTitle = (message: string) => {
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  const extractDiagnosesFromResponse = (response: string): { cleanResponse: string; extractedDiagnoses: any[] } => {
    try {
      // Look for JSON-like structures in the response
      const jsonRegex = /\[[\s\S]*?\]/g;
      const matches = response.match(jsonRegex);
      
      if (matches) {
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].diagnosis) {
              // Remove the JSON from the response
              const cleanResponse = response.replace(match, '').trim();
              return { cleanResponse, extractedDiagnoses: parsed };
            }
          } catch (e) {
            // Continue looking for other JSON structures
          }
        }
      }
    } catch (error) {
      console.error('Error extracting diagnoses:', error);
    }
    
    return { cleanResponse: response, extractedDiagnoses: [] };
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
          conversation_id: conversationId,
          patient_id: selectedUser?.id // Pass patient context
        }
      });

      if (error) {
        throw error;
      }

      let responseContent = data.response || 'I apologize, but I was unable to generate a response. Please try again.';
      
      // Extract diagnoses from response
      const { cleanResponse, extractedDiagnoses } = extractDiagnosesFromResponse(responseContent);
      
      // Use clean response for chat message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: cleanResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message if authenticated
      if (user && conversationId) {
        await saveMessage(conversationId, 'ai', aiMessage.content);
      }

      // Handle diagnoses update if returned from API or extracted
      if (data.diagnoses && data.diagnoses.length > 0) {
        setDiagnoses(data.diagnoses);
      } else if (extractedDiagnoses.length > 0) {
        setDiagnoses(extractedDiagnoses);
      } else {
        // Generate diagnoses after a delay to allow message processing
        setTimeout(() => {
          generateDiagnoses();
        }, 1000);
      }
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

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">DrKnowsIt</h1>
            {selectedUser && (
              <span className="text-sm text-muted-foreground">
                - {selectedUser.first_name} {selectedUser.last_name}
              </span>
            )}
          </div>
        </header>

        {/* Messages Area - Scrollable container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white mx-auto mb-4">
                      <Bot className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                    <p className="text-muted-foreground mb-6">I'm here to assist with your health questions and concerns.</p>
                    
                    {/* Example Prompts */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                      {examplePrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendMessage(prompt)}
                          className="text-sm"
                          disabled={!subscribed}
                        >
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.type === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.type === 'ai' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[85%] px-4 py-3 text-sm rounded-2xl break-words",
                        message.type === 'user' 
                          ? "bg-primary text-primary-foreground rounded-br-md" 
                          : "bg-muted text-foreground rounded-bl-md"
                      )}
                    >
                      {message.content}
                    </div>

                    {message.type === 'user' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0 mt-1">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-border bg-background">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder={subscribed ? "Message DrKnowsIt..." : "Subscribe to start chatting..."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-base border-2 border-border bg-background focus:border-primary rounded-xl px-4 py-3 h-auto"
                  disabled={!subscribed}
                />
              </div>
              <Button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || !subscribed}
                size="lg"
                className="rounded-xl px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {/* Warning disclaimer */}
            <div className="mt-2 text-xs text-center text-muted-foreground">
              DrKnowsIt can make mistakes. Consider checking important information with healthcare professionals.
            </div>
          </div>
        </div>
      </div>

      {/* Diagnoses Sidebar */}
      {selectedUser && diagnoses.length > 0 && (
        <div className="w-80 border-l border-border bg-background overflow-y-auto">
          <div className="p-4">
            <ProbableDiagnoses 
              diagnoses={diagnoses.map(d => ({
                diagnosis: d.diagnosis,
                confidence: d.confidence,
                reasoning: d.reasoning,
                updated_at: d.updated_at
              }))}
              patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
              patientId={selectedUser.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const ChatGPTInterface = ({ onSendMessage }: ChatGPTInterfaceProps) => {
  const { user } = useAuth();
  const conv = useConversations();

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationSidebar 
        conversations={conv.conversations}
        currentConversation={conv.currentConversation}
        onSelectConversation={conv.selectConversation}
        onStartNewConversation={conv.startNewConversation}
        onDeleteConversation={conv.deleteConversation}
        isAuthenticated={!!user}
      />
      <main className="flex-1 h-full overflow-hidden">
        <ChatInterface 
          onSendMessage={onSendMessage} 
          conversation={{
            currentConversation: conv.currentConversation,
            messages: conv.messages,
            setMessages: conv.setMessages,
            createConversation: conv.createConversation,
            saveMessage: conv.saveMessage,
          }}
        />
      </main>
    </div>
  );
};