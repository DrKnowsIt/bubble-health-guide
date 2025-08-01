import { useState, useEffect } from 'react';
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

  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

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
      console.error('No user found when trying to create conversation');
      return null;
    }

    try {
      console.log('Creating conversation with:', { 
        title, 
        patientId, 
        userId: user.id,
        userEmail: user.email 
      });
      
      const insertData = {
        user_id: user.id,
        title,
        patient_id: patientId
      };
      
      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating conversation:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Conversation created successfully:', data);
      
      // Set as current conversation immediately
      setCurrentConversation(data.id);
      
      // Update conversations list immediately with the new conversation
      setConversations(prev => [data, ...prev]);
      
      // Add default intro message to the new conversation
      try {
        await saveMessage(
          data.id, 
          'ai', 
          "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?"
        );
        console.log('Default message saved successfully');
      } catch (messageError) {
        console.error('Error saving default message:', messageError);
      }
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
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
    setCurrentConversation(null);
    setMessages([{
      id: 'welcome',
      type: 'ai',
      content: "Hello! I'm DrKnowsIt, your AI health assistant. I can help answer questions about health, symptoms, medications, wellness tips, and general medical information. What would you like to know today?",
      timestamp: new Date()
    }]);
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
    fetchMessages(conversationId);
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;

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

      // Update local state
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

      toast({
        title: "Conversation deleted",
        description: "The conversation has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
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
  }, [user]);

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
    deleteConversation
  };
};