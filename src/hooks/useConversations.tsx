// Update the useConversations hook to include real-time subscriptions
// File: src/hooks/useConversations.tsx

import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUsers } from './useUsers';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  image_url?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { selectedUser } = useUsers();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debug logging
  const logDebug = (action: string, data?: any) => {
    console.log(`[Conversations Debug] ${action}:`, data);
  };

  const fetchConversations = useCallback(async () => {
    if (!user || !selectedUser?.id) {
      flushSync(() => setConversations([]));
      return;
    }
    
    logDebug('Fetching conversations for user/patient', { userId: user.id, patientId: selectedUser.id });
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('patient_id', selectedUser.id)
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
  }, [user, selectedUser?.id]);

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
        timestamp: new Date(msg.created_at),
        image_url: msg.image_url
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

    logDebug('Creating conversation', { title, patientId, userId: user.id });

    try {
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
        throw error;
      }
      
      logDebug('Conversation created successfully in database', data);
      
      // Immediately update local state with flushSync for synchronous update
      flushSync(() => {
        setConversations(prev => [data, ...prev]);
        setCurrentConversation(data.id);
      });
      
      logDebug('Conversation added to local state');
      
      return data.id;
    } catch (error) {
      logDebug('Error creating conversation', error);
      return null;
    }
  };

  const saveMessage = async (conversationId: string, type: 'user' | 'ai', content: string, imageUrl?: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          type,
          content,
          image_url: imageUrl
        });

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Fetch updated conversations to reflect the change
      await fetchConversations();

    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Update conversation title, optionally only if it's the placeholder
  const updateConversationTitle = async (conversationId: string, newTitle: string, onlyIfPlaceholder = false) => {
    try {
      const target = conversations.find(c => c.id === conversationId);
      if (!target) return;
      if (onlyIfPlaceholder && target.title && target.title !== 'New Visit') return;

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle, updated_at: nowIso })
        .eq('id', conversationId);

      if (error) throw error;

      // Optimistically update local state
      flushSync(() => {
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: newTitle, updated_at: nowIso } : c));
      });
    } catch (e) {
      console.error('Error updating conversation title:', e);
    }
  };

  const updateConversationTitleIfPlaceholder = async (conversationId: string, newTitle: string) => {
    return updateConversationTitle(conversationId, newTitle, true);
  };

  const startNewConversation = () => {
    logDebug('Starting new conversation - clearing all conversation state');
    
    flushSync(() => {
      setCurrentConversation(null);
      setMessages([]);
    });
    
    logDebug('New conversation state set - conversation and messages cleared');
  };

  const selectConversation = (conversationId: string) => {
    logDebug('Selecting conversation', conversationId);
    flushSync(() => {
      setCurrentConversation(conversationId);
    });
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
        
        // If we deleted the current conversation, reset to empty state
        if (currentConversation === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
      });

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

  // Effect for initial load and when user or selected patient changes
  useEffect(() => {
    if (!user || !selectedUser?.id) {
      logDebug('No user or selected patient, clearing all state');
      flushSync(() => {
        setConversations([]);
        setCurrentConversation(null);
        setMessages([]);
      });
      return;
    }

    logDebug('User or patient changed, resetting state and fetching conversations', { 
      userId: user.id, 
      patientId: selectedUser.id,
      previousConversationCount: conversations.length 
    });
    
    // Immediately clear all state when switching patients to prevent cross-contamination
    flushSync(() => {
      setCurrentConversation(null);
      setMessages([]);
      setConversations([]); // Clear conversations first to ensure clean slate
    });
    
    // Fetch fresh conversations for the new patient
    fetchConversations();
  }, [user, selectedUser?.id, fetchConversations]);

  // NEW: Set up real-time subscription for conversation changes
  useEffect(() => {
    if (!user || !selectedUser?.id) return;

    logDebug('Setting up real-time subscription for conversations');

    const channel = supabase
      .channel('conversations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logDebug('Real-time conversation update received', payload);
          
          const newRow: any = payload.new;
          const oldRow: any = payload.old;

          if (payload.eventType === 'INSERT') {
            if (newRow?.patient_id !== selectedUser.id) return; // ignore other patients
            // Add new conversation to the list
            flushSync(() => {
              setConversations(prev => {
                if (!prev.find(conv => conv.id === payload.new.id)) {
                  return [payload.new as Conversation, ...prev];
                }
                return prev;
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            if (newRow?.patient_id !== selectedUser.id) return; // ignore other patients
            // Update existing conversation
            flushSync(() => {
              setConversations(prev => 
                prev.map(conv => 
                  conv.id === payload.new.id ? payload.new as Conversation : conv
                ).sort((a, b) => 
                  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                )
              );
            });
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted conversation
            flushSync(() => {
              setConversations(prev => prev.filter(conv => conv.id !== oldRow?.id));
            });
          }
        }
      )
      .subscribe();

    return () => {
      logDebug('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser?.id]);

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
    updateConversationTitleIfPlaceholder,
  };
};