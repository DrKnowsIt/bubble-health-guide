import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Plus, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, Message } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ProbableDiagnoses } from "@/components/ProbableDiagnoses";

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

function ChatSidebar() {
  const { state } = useSidebar();
  const {
    conversations,
    currentConversation,
    startNewConversation,
    selectConversation,
    deleteConversation
  } = useConversations();

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="h-full">
      <SidebarContent className="h-full">
        <SidebarGroup className="h-full">
          <SidebarGroupLabel className="flex items-center justify-between px-3 py-2 border-b">
            {!isCollapsed && (
              <>
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat History
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={startNewConversation}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
            {isCollapsed && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={startNewConversation}
                className="h-6 w-6 p-0 mx-auto"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <SidebarMenu className="p-2">
                {conversations.length === 0 && !isCollapsed ? (
                  <div className="text-center text-muted-foreground text-sm p-4">
                    <p>No conversations yet</p>
                    <p className="mt-1 text-xs">Start chatting below</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id} className="mb-1">
                      <SidebarMenuButton
                        isActive={currentConversation === conversation.id}
                        onClick={() => selectConversation(conversation.id)}
                        className="group relative w-full justify-start text-left"
                      >
                        <MessageCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{conversation.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(conversation.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 flex-shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function ChatInterface({ onSendMessage }: ChatGPTInterfaceProps) {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { selectedUser } = useUsers();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    currentConversation,
    messages,
    setMessages,
    createConversation,
    saveMessage,
  } = useConversations();
  
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
      <div className="flex flex-col flex-1 h-full">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">DrKnowsIt</h1>
            {selectedUser && (
              <span className="text-sm text-muted-foreground">
                - {selectedUser.first_name} {selectedUser.last_name}
              </span>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
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
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
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
  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <ChatSidebar />
        <main className="flex-1 h-full">
          <ChatInterface onSendMessage={onSendMessage} />
        </main>
      </div>
    </SidebarProvider>
  );
};