import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

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
  patient_id?: string | null;
}

const CONVERSATIONS_QUERY_KEY = 'conversations';
const MESSAGES_QUERY_KEY = 'messages';

export const useConversationsQuery = (selectedUser?: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Clear conversation state when user changes to prevent cross-contamination
  useEffect(() => {
    console.log('🔄 User changed in useConversationsQuery:', selectedUser?.id);
    
    // Clear current conversation if it doesn't belong to the new user
    if (currentConversation && selectedUser?.id) {
      const currentConv = conversations.find(c => c.id === currentConversation);
      if (currentConv && !conversations.some(c => c.id === currentConversation)) {
        console.log('🚫 Clearing conversation that doesn\'t belong to current user');
        setCurrentConversation(null);
        setMessages([]);
      }
    } else if (currentConversation && !selectedUser?.id) {
      // If no user selected, clear conversation
      console.log('🚫 Clearing conversation - no user selected');
      setCurrentConversation(null);
      setMessages([]);
    }
    
    // Invalidate all conversation-related cache for clean state
    queryClient.invalidateQueries({ 
      queryKey: [CONVERSATIONS_QUERY_KEY] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [MESSAGES_QUERY_KEY] 
    });
  }, [selectedUser?.id]);

  // Fetch conversations with caching
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations
  } = useQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) {
        console.log('🚫 No user available for conversations query');
        return [];
      }
      
      console.log('🔍 Fetching conversations for user:', user.id, 'patient:', selectedUser?.id);
      
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id);
      
      if (selectedUser?.id) {
        query = query.eq('patient_id', selectedUser.id);
      } else {
        query = query.is('patient_id', null);
      }
      
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) {
        console.error('❌ Error fetching conversations:', error);
        throw error;
      }
      
      console.log('✅ Fetched conversations:', data?.length || 0, 'conversations');
      return data || [];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch messages with caching
  const {
    data: fetchedMessages = [],
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: [MESSAGES_QUERY_KEY, currentConversation],
    queryFn: async (): Promise<Message[]> => {
      if (!currentConversation) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'ai',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        image_url: msg.image_url
      }));
      
      // Update local messages state when data changes
      setMessages(formattedMessages);
      return formattedMessages;
    },
    enabled: !!currentConversation,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ title, patientId }: { title: string; patientId?: string | null }) => {
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          patient_id: patientId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Save message mutation
  const saveMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      type, 
      content, 
      imageUrl 
    }: { 
      conversationId: string; 
      type: 'user' | 'ai'; 
      content: string; 
      imageUrl?: string; 
    }) => {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          type,
          content,
          image_url: imageUrl
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
  });

  // Delete conversation mutation with confirmation
  const deleteConversationMutation = useMutation({
    mutationFn: async ({ conversationId, confirmed }: { conversationId: string; confirmed?: boolean }) => {
      if (!user) throw new Error('No user found');
      
      if (!confirmed) {
        throw new Error('Deletion not confirmed');
      }

      // Delete messages first
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
      return conversationId;
    },
    onMutate: async ({ conversationId }: { conversationId: string; confirmed?: boolean }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      
      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id]);
      
      // Optimistically update to remove the conversation
      queryClient.setQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id], (old: Conversation[] = []) => {
        return old.filter((conv) => conv.id !== conversationId);
      });
      
      // Clear current conversation and messages immediately if it matches the deleted one
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      return { previousConversations };
    },
    onError: (err, { conversationId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConversations) {
        queryClient.setQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id], context.previousConversations);
      }
      logger.error('Error deleting conversation:', err);
      
      // Only show error toast if it's not a confirmation error
      if (!err.message.includes('not confirmed')) {
        toast({
          title: "Error",
          description: "Failed to delete conversation. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Update conversation title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      newTitle, 
      onlyIfPlaceholder = false 
    }: { 
      conversationId: string; 
      newTitle: string; 
      onlyIfPlaceholder?: boolean; 
    }) => {
      const target = conversations.find(c => c.id === conversationId);
      if (!target) throw new Error('Conversation not found');
      if (onlyIfPlaceholder && target.title && target.title !== 'New Visit') return;

      const { error } = await supabase
        .from('conversations')
        .update({ 
          title: newTitle, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
  });

  // Effects for handling mutation success/error
  useEffect(() => {
    if (createConversationMutation.isSuccess && createConversationMutation.data) {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      setCurrentConversation(createConversationMutation.data.id);
    }
    
    if (createConversationMutation.error) {
      logger.error('Error creating conversation:', createConversationMutation.error);
    }
  }, [createConversationMutation.isSuccess, createConversationMutation.data, createConversationMutation.error, queryClient]);

  useEffect(() => {
    if (saveMessageMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, currentConversation] });
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
    }
    
    if (saveMessageMutation.error) {
      logger.error('Error saving message:', saveMessageMutation.error);
    }
  }, [saveMessageMutation.isSuccess, saveMessageMutation.error, queryClient, currentConversation]);

  useEffect(() => {
    if (deleteConversationMutation.isSuccess && deleteConversationMutation.data) {
      const deletedConversationId = deleteConversationMutation.data;
      
      // Invalidate conversations query
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      
      // Invalidate and remove messages cache for the deleted conversation
      queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, deletedConversationId] });
      queryClient.removeQueries({ queryKey: [MESSAGES_QUERY_KEY, deletedConversationId] });
      
      // Clear current conversation and messages if it matches the deleted one
      if (currentConversation === deletedConversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Only show success toast for confirmed deletions
      // No automatic toast to avoid confusion
    }
    
    if (deleteConversationMutation.error) {
      logger.error('Error deleting conversation:', deleteConversationMutation.error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
    }
  }, [deleteConversationMutation.isSuccess, deleteConversationMutation.data, deleteConversationMutation.error, queryClient, currentConversation]);

  useEffect(() => {
    if (updateTitleMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
    }
    
    if (updateTitleMutation.error) {
      logger.error('Error updating conversation title:', updateTitleMutation.error);
    }
  }, [updateTitleMutation.isSuccess, updateTitleMutation.error, queryClient]);

  // Clear messages when currentConversation becomes null
  useEffect(() => {
    if (currentConversation === null) {
      setMessages([]);
    }
  }, [currentConversation]);

  const selectConversation = useCallback((conversationId: string) => {
    // Validate that the conversation belongs to the current user/patient combination
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.warn('🚫 Cannot select conversation - not found in current conversations list:', conversationId);
      return;
    }
    
    console.log('✅ Selecting conversation:', conversationId, 'for user:', user?.id, 'patient:', selectedUser?.id);
    setCurrentConversation(conversationId);
  }, [conversations, user?.id, selectedUser?.id]);

  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      console.warn('⚠️ No user ID available for conversations query - user may need to authenticate');
      return;
    }

    console.log('🔄 Setting up real-time conversation subscription for user:', user.id, 'selectedUser:', selectedUser?.id);
    
    let filter = `user_id=eq.${user.id}`;
    if (selectedUser?.id) {
      filter += `&patient_id=eq.${selectedUser.id}`;
    } else {
      filter += `&patient_id=is.null`;
    }
    
    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: filter
        },
        (payload) => {
          console.log('📡 Conversation change for user/patient:', { user: user.id, patient: selectedUser?.id }, payload);
          
          // Only invalidate queries for the current user/patient combination
          queryClient.invalidateQueries({ 
            queryKey: [CONVERSATIONS_QUERY_KEY, user.id, selectedUser?.id] 
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up conversation subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedUser?.id, queryClient]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!currentConversation) return;

    logger.debug('Setting up real-time subscription for messages:', currentConversation);

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation}`
        },
        (payload) => {
          logger.debug('Real-time message update:', payload);
          queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, currentConversation] });
        }
      )
      .subscribe();

    return () => {
      logger.debug('Cleaning up messages real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [currentConversation, queryClient]);

  return {
    conversations,
    currentConversation,
    messages,
    setMessages,
    loading: conversationsLoading || messagesLoading,
    createConversation: async (title: string, patientId?: string | null): Promise<string | null> => {
      return new Promise((resolve) => {
        createConversationMutation.mutate({ title, patientId }, {
          onSuccess: (data) => resolve(data.id),
          onError: () => resolve(null)
        });
      });
    },
    saveMessage: async (conversationId: string, type: 'user' | 'ai', content: string, imageUrl?: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        saveMessageMutation.mutate({ conversationId, type, content, imageUrl }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        });
      });
    },
    startNewConversation,
    selectConversation,
    fetchConversations: refetchConversations,
    deleteConversation: (conversationId: string, confirmed: boolean = false) => 
      deleteConversationMutation.mutate({ conversationId, confirmed }),
    updateConversationTitleIfPlaceholder: async (conversationId: string, newTitle: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        updateTitleMutation.mutate({ conversationId, newTitle, onlyIfPlaceholder: true }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        });
      });
    },
    isCreatingConversation: createConversationMutation.isPending,
    isSavingMessage: saveMessageMutation.isPending,
    isDeletingConversation: deleteConversationMutation.isPending,
  };
};