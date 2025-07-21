import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Mic, MicOff, Bot, User, Loader2, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePatients, Patient } from '@/hooks/usePatients';
import { useConversations, Message } from '@/hooks/useConversations';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { PatientSelector } from './PatientSelector';
import { ProbableDiagnoses } from './ProbableDiagnoses';
import { TierStatus } from './TierStatus';
import { ConversationHistory } from './ConversationHistory';
import { PatientDropdown } from './PatientDropdown';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatInterfaceWithPatientsProps {
  onSendMessage?: (message: string) => void;
  isMobile?: boolean;
}

export const ChatInterfaceWithPatients = ({ onSendMessage, isMobile = false }: ChatInterfaceWithPatientsProps) => {
  const { user } = useAuth();
  const { patients, selectedPatient, setSelectedPatient, loading: patientsLoading } = usePatients();
  const { 
    messages, 
    loading: messagesLoading, 
    setMessages,
    currentConversation,
    selectConversation,
    createConversation,
    saveMessage 
  } = useConversations();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isProcessing,
    toggleRecording
  } = useVoiceRecording({
    onTranscription: (text) => setInputValue(text)
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedPatient) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      // Call AI service here
      const { data, error } = await supabase.functions.invoke('grok-chat', {
        body: { 
          message: currentInput,
          patientId: selectedPatient.id,
          conversationId: currentConversation 
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'ai',
        content: data.response || 'I apologize, but I am unable to process your request at the moment.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      onSendMessage?.(currentInput);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
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

  const handleConversationSelect = async (conversationId: string) => {
    try {
      await selectConversation(conversationId);
      setActiveTab('chat');
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewConversation = async () => {
    if (!selectedPatient) return;
    
    try {
      const newConversationId = await createConversation(
        `Chat with ${selectedPatient.first_name}`, 
        selectedPatient.id
      );
      
      if (newConversationId) {
        await selectConversation(newConversationId);
      }
      
      setActiveTab('chat');
    } catch (error) {
      console.error('Error creating new conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      // Create or switch to conversation for this patient
      handleNewConversation();
    }
  };

  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center p-8">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Patients Found</h3>
        <p className="text-muted-foreground mb-4">
          You need to add patients before you can start chatting.
        </p>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <PatientDropdown
            patients={patients}
            selectedPatient={selectedPatient}
            onPatientSelect={handlePatientSelect}
            open={patientDropdownOpen}
            onOpenChange={setPatientDropdownOpen}
          />
        </div>

        {selectedPatient && (
          <div className="p-4 border-b">
            <ProbableDiagnoses 
              diagnoses={selectedPatient.probable_diagnoses || []}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
              patientId={selectedPatient.id}
            />
          </div>
        )}

        {/* Mobile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
            <Card className="flex-1 flex flex-col mx-4">
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[400px]">
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
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {message.type === 'user' ? (
                          <User className="h-5 w-5" />
                        ) : (
                          <Bot className="h-5 w-5" />
                        )}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden ${
                          message.type === 'user'
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                      className="min-h-[50px] max-h-[120px] resize-none pr-12"
                      disabled={!selectedPatient}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 h-8 w-8 p-0"
                      onClick={toggleRecording}
                      disabled={!selectedPatient || isProcessing}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping || !selectedPatient}
                    className="h-[50px] px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="flex-1 mt-4 mx-4">
            <ConversationHistory
              selectedPatientId={selectedPatient?.id}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              activeConversationId={currentConversation}
            />
          </TabsContent>
        </Tabs>
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
      
      <div className="flex-[2] flex space-x-4">
        {/* Left Sidebar - History and Patient Selection */}
        <div className="w-80 space-y-4">
          {/* Patient Selection */}
          <Card>
            <CardContent className="p-4">
              <PatientDropdown
                patients={patients}
                selectedPatient={selectedPatient}
                onPatientSelect={handlePatientSelect}
                open={patientDropdownOpen}
                onOpenChange={setPatientDropdownOpen}
              />
            </CardContent>
          </Card>

          {/* Conversation History */}
          <div className="flex-1">
            <ConversationHistory
              selectedPatientId={selectedPatient?.id}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              activeConversationId={currentConversation}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-[600px]">
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[500px]">
              {!selectedPatient ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Patient</h3>
                    <p className="text-muted-foreground">
                      Choose a patient from the dropdown to start chatting.
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {message.type === 'user' ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Bot className="h-5 w-5" />
                          )}
                        </div>
                        <div
                          className={`px-4 py-3 rounded-2xl max-w-full overflow-hidden ${
                            message.type === 'user'
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
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
                </>
              )}
            </CardContent>

            <div className="border-t p-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Describe your symptoms..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[50px] max-h-[120px] resize-none pr-12"
                    disabled={!selectedPatient}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-2 right-2 h-8 w-8 p-0"
                    onClick={toggleRecording}
                    disabled={!selectedPatient || isProcessing}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || !selectedPatient}
                  className="h-[50px] px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar - Probable Diagnoses */}
        <div className="w-80">
          {selectedPatient && (
            <ProbableDiagnoses 
              diagnoses={selectedPatient.probable_diagnoses || []}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
              patientId={selectedPatient.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};