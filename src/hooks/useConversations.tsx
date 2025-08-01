import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Ref to track optimistic updates for rollback
  const optimisticConversationRef = useRef<Conversation | null>(null);
  
  // Debug logging
  const logDebug = (action: string, data?: any) => {
    console.log(`[Conversations Debug] ${action}:`, data);
  };

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    logDebug('Fetching conversations for user', user.id);
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      logDebug('Conversations fetched', { count: data?.length || 0 });
      
      // Use flushSync to ensure immediate state update
      flushSync(() => {
        setConversations(data || []);
      });
      
    } catch (error) {
      console.error('Error fetching conversations:', error);
      logDebug('Error fetching conversations', error);
    }
  }, [user]);

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'ai',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title: string, patientId?: string | null) => {
    if (!user) {
      logDebug('No user found when trying to create conversation');
      return null;
    }

    // Create optimistic conversation for immediate UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticConversation: Conversation = {
      id: tempId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    logDebug('Creating conversation with optimistic update', { 
      title, 
      patientId, 
      userId: user.id,
      tempId
    });

    try {
      // Optimistic update - add conversation immediately to UI
      optimisticConversationRef.current = optimisticConversation;
      flushSync(() => {
        setConversations(prev => [optimisticConversation, ...prev]);
        setCurrentConversation(tempId);
      });
      
      logDebug('Optimistic conversation added to UI');
      
      const insertData = {
        user_id: user.id,
        title,
        patient_id: patientId
      };
      
      logDebug('Inserting conversation to database', insertData);
      
      const { data, error } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logDebug('Database error creating conversation', error);
        
        // Rollback optimistic update
        flushSync(() => {
          setConversations(prev => prev.filter(conv => conv.id !== tempId));
          setCurrentConversation(null);
        });
        optimisticConversationRef.current = null;
        
        throw error;
      }
      
      logDebug('Conversation created successfully in database', data);
      
      // Replace optimistic conversation with real one
      flushSync(() => {
        setConversations(prev => 
          prev.map(conv => conv.id === tempId ? data : conv)
        );
        setCurrentConversation(data.id);
      });
      
      optimisticConversationRef.current = null;
      
      // Trigger refresh to ensure sidebar is in sync
      setRefreshTrigger(prev => prev + 1);
      
      // Add default intro message to the new conversation
      try {
        await saveMessage(
          data.id, 
          'ai', 
          "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?"
        );
        logDebug('Default message saved successfully');
      } catch (messageError) {
        logDebug('Error saving default message', messageError);
      }
      
      return data.id;
    } catch (error) {
      logDebug('Error creating conversation', error);
      
      // Ensure rollback happened if not already done
      if (optimisticConversationRef.current) {
        flushSync(() => {
          setConversations(prev => prev.filter(conv => conv.id !== tempId));
          setCurrentConversation(null);
        });
        optimisticConversationRef.current = null;
      }
      
      return null;
    }
  };

  const saveMessage = async (conversationId: string, type: 'user' | 'ai', content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          type,
          content
        });

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const startNewConversation = () => {
    logDebug('Starting new conversation');
    
    flushSync(() => {
      setCurrentConversation(null);
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?",
        timestamp: new Date()
      }]);
    });
    
    // Trigger refresh to ensure conversations are up to date
    setRefreshTrigger(prev => prev + 1);
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
    fetchMessages(conversationId);
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;

    logDebug('Deleting conversation', conversationId);

    try {
      // Delete messages first (due to foreign key constraint)
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state with flushSync for immediate update
      flushSync(() => {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If we deleted the current conversation, start a new one
        if (currentConversation === conversationId) {
          setCurrentConversation(null);
          setMessages([{
            id: 'welcome',
            type: 'ai',
            content: "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?",
            timestamp: new Date()
          }]);
        }
      });

      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);

      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully deleted.",
      });
      
      logDebug('Conversation deleted successfully');
    } catch (error) {
      logDebug('Error deleting conversation', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Effect for initial load and user changes
  useEffect(() => {
    if (user) {
      logDebug('User changed, fetching conversations');
      fetchConversations();
      if (!currentConversation) {
        setCurrentConversation(null);
        setMessages([{
          id: 'welcome',
          type: 'ai',
          content: "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?",
          timestamp: new Date()
        }]);
      }
    }
  }, [user, fetchConversations]);

  // Effect for refresh trigger - ensures conversations are synced
  useEffect(() => {
    if (refreshTrigger > 0 && user) {
      logDebug('Refresh triggered, re-fetching conversations');
      fetchConversations();
    }
  }, [refreshTrigger, user, fetchConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    setMessages,
    createConversation,
    saveMessage,
    startNewConversation,
    selectConversation,
    fetchConversations,
    deleteConversation,
    refreshTrigger // Expose for external components to track updates
  };
};