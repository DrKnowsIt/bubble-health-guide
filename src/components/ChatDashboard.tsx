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
    if (currentConversation && selectedPatient?.id) {
      loadDiagnosesForConversation();
    } else {
      setDiagnoses([]);
    }
  }, [currentConversation, selectedPatient?.id]);

  const loadDiagnosesForConversation = async () => {
    try {
      // Extract potential diagnoses from the current conversation messages
      // This is a simple implementation - in a real app, you'd use AI to generate diagnoses
      const userMessages = messages.filter(msg => msg.type === 'user');
      const aiMessages = messages.filter(msg => msg.type === 'ai');
      
      if (userMessages.length > 0 && aiMessages.length > 0) {
        // Mock diagnoses based on conversation content
        const mockDiagnoses: Diagnosis[] = [
          {
            diagnosis: "General Health Assessment",
            confidence: 0.7,
            reasoning: "Based on the conversation, general health topics were discussed that may warrant doctor consultation.",
            updated_at: new Date().toISOString()
          }
        ];

        // Look for symptom keywords to create more specific diagnoses
        const conversationText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
        
        if (conversationText.includes('headache') || conversationText.includes('head pain')) {
          mockDiagnoses.push({
            diagnosis: "Headache Assessment",
            confidence: 0.8,
            reasoning: "Patient mentioned headache symptoms that should be evaluated by a healthcare professional.",
            updated_at: new Date().toISOString()
          });
        }

        if (conversationText.includes('fever') || conversationText.includes('temperature')) {
          mockDiagnoses.push({
            diagnosis: "Fever Evaluation",
            confidence: 0.75,
            reasoning: "Patient reported fever symptoms requiring medical assessment.",
            updated_at: new Date().toISOString()
          });
        }

        if (conversationText.includes('chest pain') || conversationText.includes('chest')) {
          mockDiagnoses.push({
            diagnosis: "Chest Pain Assessment",
            confidence: 0.9,
            reasoning: "Chest pain symptoms mentioned - urgent medical evaluation recommended.",
            updated_at: new Date().toISOString()
          });
        }

        setDiagnoses(mockDiagnoses);
      }
    } catch (error) {
      console.error('Error loading diagnoses:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    // After sending a message, reload diagnoses to reflect new conversation content
    setTimeout(() => {
      loadDiagnosesForConversation();
    }, 2000); // Wait for AI response to be processed
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