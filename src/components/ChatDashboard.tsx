import { useState, useEffect } from 'react';
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
import { History } from 'lucide-react';

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

  // Load diagnoses for current conversation and patient
  useEffect(() => {
    if (currentConversation && selectedPatient?.id && messages.length > 0) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedPatient?.id, messages.length]);

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

  if (!user || !subscribed) {
    return <ChatInterfaceWithHistory />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Patient Selector */}
      <div className="shrink-0">
        <PatientSelector />
      </div>

      {/* Main Chat Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation History Sidebar - Left */}
        <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden shrink-0`}>
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

        {/* Diagnosis Panel - Right */}
        {selectedPatient && currentConversation && (
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