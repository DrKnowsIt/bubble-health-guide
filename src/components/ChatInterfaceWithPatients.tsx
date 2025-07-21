import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { PatientSelector } from './PatientSelector';
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { TierStatus } from './TierStatus';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatInterfaceWithPatientsProps {
  onSendMessage?: (message: string) => void;
  isMobile?: boolean;
}

export const ChatInterfaceWithPatients = ({ 
  onSendMessage, 
  isMobile = false 
}: ChatInterfaceWithPatientsProps) => {
  const { user } = useAuth();
  const { patients, selectedPatient, loading: patientsLoading } = usePatients();
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    createConversation, 
    saveMessage,
    selectConversation
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording functionality
  const { isRecording, isProcessing, toggleRecording } = useVoiceRecording({
    onTranscription: (text: string) => {
      setInputValue(text);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateConversationTitle = (message: string): string => {
    const words = message.trim().split(' ').slice(0, 6);
    return words.join(' ') + (message.split(' ').length > 6 ? '...' : '');
  };

  const sendMessageToGrok = async (message: string, conversationHistory: Message[], patientId?: string) => {
    try {
      const response = await supabase.functions.invoke('grok-chat', {
        body: {
          message,
          conversation_history: conversationHistory.map(msg => ({
            type: msg.type,
            content: msg.content
          })),
          patient_id: patientId,
          user_id: user?.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error('Error calling Grok API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Check authentication
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to chat with the AI.",
        variant: "destructive",
      });
      return;
    }

    // For mobile, ensure a patient is selected
    if (isMobile && !selectedPatient) {
      toast({
        title: "Select a patient",
        description: "Please select a patient to start chatting.",
        variant: "destructive",
      });
      return;
    }

    const messageText = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);

    try {
      // Create conversation if needed
      let conversationId = currentConversation;
      if (!conversationId) {
        const title = generateConversationTitle(messageText);
        conversationId = await createConversation(title, selectedPatient?.id);
        if (!conversationId) {
          throw new Error('Failed to create conversation');
        }
      }

      // Save user message
      await saveMessage(conversationId, 'user', messageText);

      // Get AI response
      const grokResponse = await sendMessageToGrok(
        messageText, 
        messages,
        selectedPatient?.id
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: grokResponse.response,
        timestamp: new Date()
      };

      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message
      await saveMessage(conversationId, 'ai', grokResponse.response);

      // If diagnoses were updated, refresh patient data
      if (grokResponse.updated_diagnoses && selectedPatient) {
        // The diagnoses are already updated in the database by the edge function
        toast({
          title: "Diagnoses updated",
          description: "AI has updated probable diagnoses based on your conversation.",
        });
      }

      onSendMessage?.(messageText);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the user message from UI on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
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

  if (patientsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading patients...</span>
        </div>
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <PatientSelector />
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {/* Tier Status - Mobile */}
        <div className="p-4 border-b">
          <TierStatus />
        </div>
        
        {/* Probable Diagnoses - Mobile */}
        {selectedPatient && (
          <div className="p-4 border-b">
            <ProbableDiagnoses 
              diagnoses={selectedPatient.probable_diagnoses || []}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            />
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[85%] space-x-2 ${
                  message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`px-3 py-2 rounded-lg ${
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted px-3 py-2 rounded-lg">
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

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask about symptoms..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              disabled={isProcessing}
              className={isRecording ? "text-destructive" : ""}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button 
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Tier Status - Desktop */}
      <div className="flex justify-between items-center">
        <TierStatus />
      </div>
      
      <div className="flex-1 flex space-x-4">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[80%] space-x-3 ${
                    message.type === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl">
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
          </CardContent>

          <div className="border-t p-4">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Describe your symptoms..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[50px] resize-none pr-12"
                  rows={2}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={`absolute right-2 bottom-2 h-8 w-8 p-0 ${
                    isRecording && "text-destructive"
                  }`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="h-[50px] px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

        {/* Sidebar - Probable Diagnoses */}
        <div className="w-80">
          {selectedPatient && (
            <ProbableDiagnoses 
              diagnoses={selectedPatient.probable_diagnoses || []}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};