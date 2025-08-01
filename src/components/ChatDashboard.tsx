import { useState, useEffect, useCallback } from 'react';
import { ChatInterfaceWithHistory } from '@/components/ChatInterfaceWithHistory';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { ProbableDiagnoses } from '@/components/ProbableDiagnoses';
import { useConversations } from '@/hooks/useConversations';
import { usePatients } from '@/hooks/usePatients';
import { PatientSelector } from '@/components/PatientSelector';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

export const ChatDashboard = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { selectedPatient } = usePatients();
  const { 
    conversations,
    currentConversation, 
    messages, 
    startNewConversation,
    selectConversation,
    deleteConversation
  } = useConversations();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Debug logging for state tracking
  const logDebug = useCallback((action: string, data?: any) => {
    console.log(`[ChatDashboard Debug] ${action}:`, data);
  }, []);
  
  // Track dependency changes
  useEffect(() => {
    logDebug('Conversations updated', { 
      count: conversations.length, 
      current: currentConversation
    });
  }, [conversations, currentConversation, logDebug]);

  // Load diagnoses for current conversation and patient
  useEffect(() => {
    logDebug('Diagnoses dependency changed', {
      currentConversation,
      patientId: selectedPatient?.id,
      messagesLength: messages.length
    });
    
    if (currentConversation && selectedPatient?.id && messages.length > 0) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedPatient?.id, messages.length, logDebug]);

  const loadDiagnosesForConversation = async () => {
    try {
      // Load existing diagnoses from database
      const { data, error } = await supabase
        .from('conversation_diagnoses')
        .select('*')
        .eq('conversation_id', currentConversation)
        .eq('patient_id', selectedPatient?.id)
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
    if (!currentConversation || !selectedPatient?.id || messages.length === 0) {
      return;
    }

    try {
      // Call the generate-diagnosis edge function
      const { data, error } = await supabase.functions.invoke('generate-diagnosis', {
        body: {
          conversation_id: currentConversation,
          patient_id: selectedPatient.id,
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

  const handleSendMessage = async (message: string) => {
    // After sending a message and getting AI response, generate diagnoses
    setTimeout(async () => {
      await generateDiagnoses();
    }, 3000); // Wait for AI response to be processed and saved
  };

  // Always show the interface, but add subscription prompt if needed
  const showSubscriptionPrompt = user && !subscribed;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Subscription Alert */}
      {showSubscriptionPrompt && (
        <div className="shrink-0 bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-warning">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Subscribe to unlock full chat features, patient management, and health diagnosis tools
            </span>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => window.location.href = '/pricing'}
              className="ml-2 h-6 px-2 text-xs"
            >
              View Plans
            </Button>
          </div>
        </div>
      )}

      {/* Patient Selector */}
      <div className={`shrink-0 ${!subscribed ? 'opacity-50 pointer-events-none' : ''}`}>
        <PatientSelector />
      </div>

      {/* Main Chat Layout */}
      <div className={`flex-1 flex gap-4 min-h-0 ${!subscribed ? 'opacity-60' : ''}`}>
        {/* Conversation History Sidebar - Left */}
        <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden shrink-0 ${!subscribed ? 'pointer-events-none' : ''}`}>
          <ConversationSidebar 
            conversations={conversations}
            currentConversation={currentConversation}
            onSelectConversation={selectConversation}
            onStartNewConversation={startNewConversation}
            onDeleteConversation={deleteConversation}
            isAuthenticated={!!user}
          />
        </div>

        {/* Main Chat Interface - Center */}
        <div className="flex-1 min-w-0">
          <ChatInterfaceWithHistory 
            onSendMessage={handleSendMessage}
            onShowHistory={() => setShowHistory(!showHistory)}
          />
        </div>

        {/* Diagnosis Panel - Right - Only show when there's an active conversation with messages */}
        {selectedPatient && currentConversation && messages.length > 1 && diagnoses.length > 0 && (
          <div className="w-80 shrink-0">
            <ProbableDiagnoses 
              diagnoses={diagnoses}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
              patientId={selectedPatient.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};