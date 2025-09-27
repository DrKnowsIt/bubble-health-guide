import React, { useState, useEffect } from 'react';
import { HealthForms } from './HealthForms';
import { DNAUpload } from '../DNAUpload';
import { SubscriptionGate } from '../SubscriptionGate';
import { EnhancedHealthTopicsPanel } from '../EnhancedHealthTopicsPanel';
import { useEnhancedHealthTopics } from '@/hooks/useEnhancedHealthTopics';
import { useConversationsQuery } from '@/hooks/optimized/useConversationsQuery';
import { supabase } from '@/integrations/supabase/client';

interface HealthDesktopTabProps {
  selectedUser: any;
}

export const HealthDesktopTab: React.FC<HealthDesktopTabProps> = ({ selectedUser }) => {
  const { conversations } = useConversationsQuery(selectedUser?.id);
  
  // Get the latest conversation context from messages
  const [conversationContext, setConversationContext] = useState('');
  
  useEffect(() => {
    const getLatestMessages = async () => {
      if (conversations.length > 0) {
        const latestConversation = conversations[0];
        const { data: messages } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', latestConversation.id)
          .order('created_at', { ascending: true });
        
        if (messages) {
          setConversationContext(messages.map(msg => msg.content).join(' '));
        }
      }
    };
    
    getLatestMessages();
  }, [conversations]);

  // Enhanced health topics integration
  const {
    topics,
    solutions,
    loading,
    feedback,
    handleTopicFeedback,
    handleSolutionFeedback,
    refreshAnalysis,
    isEmpty,
    solutionsEmpty,
    highPriorityTopics,
    followUpRequired,
    immediateActions,
    totalDataSources
  } = useEnhancedHealthTopics({
    conversationId: conversations[0]?.id || null,
    patientId: selectedUser?.id || null,
    conversationContext: conversationContext,
    includeSolutions: true,
    realTimeUpdates: true
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6">
        <HealthForms selectedPatient={selectedUser} />
        
        {/* Enhanced Health Topics & Solutions - Available for Basic and Pro */}
        <SubscriptionGate 
          requiredTier="basic" 
          feature="Health Topics & Holistic Solutions" 
          description="Get AI-powered health insights and holistic treatment recommendations based on your conversations and health data. Available with Basic or Pro subscription."
        >
          <EnhancedHealthTopicsPanel
            topics={topics}
            solutions={solutions}
            loading={loading}
            feedback={feedback}
            highPriorityTopics={highPriorityTopics}
            followUpRequired={followUpRequired}
            immediateActions={immediateActions}
            totalDataSources={totalDataSources}
            onTopicFeedback={handleTopicFeedback}
            onSolutionFeedback={handleSolutionFeedback}
            onRefresh={refreshAnalysis}
            patientName={selectedUser?.first_name || 'Patient'}
          />
        </SubscriptionGate>
        
        <SubscriptionGate requiredTier="pro" feature="DNA/Genetics Analysis" description="Upload DNA data from companies like 23andMe or Ancestry for advanced genetic insights — available on Pro.">
          <DNAUpload 
            selectedPatient={selectedUser} 
            onUploadComplete={() => {}}
          />
        </SubscriptionGate>
      </div>
    </div>
  );
};