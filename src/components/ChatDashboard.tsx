// Updated ChatDashboard component with proper conversation management
// File: src/components/ChatDashboard.tsx

import { useState, useEffect, useCallback } from 'react';
import { ChatInterfaceWithHistory } from '@/components/ChatInterfaceWithHistory';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { ProbableDiagnoses } from '@/components/ProbableDiagnoses';
import { useConversations } from '@/hooks/useConversations';
import { useUsers } from '@/hooks/useUsers';
import { UserSelector } from '@/components/UserSelector';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { PlanSelectionCard } from '@/components/PlanSelectionCard';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

export const ChatDashboard = () => {
  const { user } = useAuth();
  const { subscribed, createCheckoutSession } = useSubscription();
  const { selectedUser } = useUsers();
  const { 
    conversations,
    currentConversation, 
    messages, 
    startNewConversation,
    selectConversation,
    deleteConversation,
    fetchConversations
  } = useConversations();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [showHistory, setShowHistory] = useState(true); // Default to showing history
  
  // Debug logging for state tracking
  const logDebug = useCallback((action: string, data?: any) => {
    console.log(`[ChatDashboard] ${action}:`, data);
  }, []);

  // Handle message sending
  const handleSendMessage = useCallback(async (message: string) => {
    logDebug('Sending message', { message, currentConversation });
    
    // Ensure history sidebar is visible when sending first message
    if (!currentConversation && conversations.length === 0) {
      setShowHistory(true);
    }
  }, [currentConversation, conversations.length, logDebug]);

  // Effect to fetch diagnoses when conversation changes
  useEffect(() => {
    const fetchDiagnoses = async () => {
      if (!selectedUser || !currentConversation) {
        setDiagnoses([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('probable_diagnoses')
          .select('*')
          .eq('conversation_id', currentConversation)
          .eq('patient_id', selectedUser.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        logDebug('Diagnoses fetched', { count: data?.length || 0 });
        setDiagnoses(data || []);
      } catch (error) {
        console.error('Error fetching diagnoses:', error);
      }
    };

    fetchDiagnoses();

    // Set up real-time subscription
    if (currentConversation && selectedUser) {
      const channel = supabase
        .channel(`diagnoses-${currentConversation}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'probable_diagnoses',
            filter: `conversation_id=eq.${currentConversation}`
          },
          () => {
            logDebug('Diagnoses updated via subscription');
            fetchDiagnoses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentConversation, selectedUser, logDebug]);

  // Handle subscription prompt
  if (!subscribed) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md">
          <PlanSelectionCard
            onSelectPlan={(tier) => createCheckoutSession(tier)}
            description="Choose the plan that fits your needs:"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">

      {/* Patient Selector */}
      <div className={`shrink-0 ${!subscribed ? 'opacity-50 pointer-events-none' : ''}`}>
        <UserSelector />
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
        {selectedUser && currentConversation && messages.length > 1 && diagnoses.length > 0 && (
          <div className="w-80 shrink-0">
            <ProbableDiagnoses 
              diagnoses={diagnoses}
              patientName={`${selectedUser.first_name} ${selectedUser.last_name}`}
              patientId={selectedUser.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};