import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useAnalysisThrottling } from '../useAnalysisThrottling';

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  image_url?: string;
  products?: Array<{
    name: string;
    price: string;
    rating: number;
    image: string;
    url: string;
    category: string;
  }>;
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
  const { cancelAnalysesForConversation } = useAnalysisThrottling();
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State recovery and stability refs
  const lastValidConversationRef = useRef<string | null>(null);
  const lastValidUserRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const conversationClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mutation protection refs
  const isCreatingConversationRef = useRef(false);
  const isSavingMessageRef = useRef(false);
  const recentlyCreatedConversationsRef = useRef<Set<string>>(new Set());
  const mutationProtectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear conversation state when user changes to prevent cross-contamination
  useEffect(() => {
    const currentUserId = selectedUser?.id || null;
    const previousUserId = lastValidUserRef.current;
    
    console.log('🔄 [useConversationsQuery] User change detected:', {
      previousUserId,
      currentUserId,
      currentConversation,
      isInitialLoad: isInitialLoadRef.current
    });
    
    // Only clear state if we're actually switching to a different user (not initial load or same user)
    if (!isInitialLoadRef.current && previousUserId !== currentUserId) {
      console.log('👤 [useConversationsQuery] User actually changed, clearing conversation state');
      
      // Clear any pending timeout
      if (conversationClearTimeoutRef.current) {
        clearTimeout(conversationClearTimeoutRef.current);
        conversationClearTimeoutRef.current = null;
      }
      
      setCurrentConversation(null);
      setMessages([]);
      lastValidConversationRef.current = null;
      
      // Invalidate queries for clean state
      queryClient.invalidateQueries({ 
        queryKey: [CONVERSATIONS_QUERY_KEY] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [MESSAGES_QUERY_KEY] 
      });
    } else {
      console.log('🔍 [useConversationsQuery] User change was initial load or same user, preserving state');
    }
    
    // Update refs
    lastValidUserRef.current = currentUserId;
    isInitialLoadRef.current = false;
  }, [selectedUser?.id, queryClient]);

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
      
      console.log('✅ Fetched conversations:', data?.length || 0, 'conversations for user:', selectedUser?.id);
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
        image_url: msg.image_url,
        products: msg.products && Array.isArray(msg.products) ? msg.products as any[] : undefined
      }));
      
      console.log('✅ [useConversationsQuery] Loaded', formattedMessages.length, 'messages for conversation:', currentConversation);
      
      // Update local messages state when data changes
      console.log('📝 [useConversationsQuery] Setting messages from query:', formattedMessages.length, 'messages');
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

      console.log('🚀 [createConversationMutation] Starting conversation creation');
      isCreatingConversationRef.current = true;

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
      
      // Track newly created conversation to prevent it from being cleared
      recentlyCreatedConversationsRef.current.add(data.id);
      console.log('✅ [createConversationMutation] Created conversation:', data.id);
      
      return data;
    },
    onSettled: () => {
      console.log('🏁 [createConversationMutation] Conversation creation settled');
      isCreatingConversationRef.current = false;
    }
  });

  // Save message mutation
  const saveMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      type, 
      content, 
      imageUrl,
      products 
    }: { 
      conversationId: string; 
      type: 'user' | 'ai'; 
      content: string; 
      imageUrl?: string;
      products?: any[];
    }) => {
      console.log('💬 [saveMessageMutation] Starting message save for conversation:', conversationId);
      isSavingMessageRef.current = true;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        type,
        content,
        image_url: imageUrl,
        products: products
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
        
      console.log('✅ [saveMessageMutation] Message saved successfully');
    },
    onSettled: () => {
      console.log('🏁 [saveMessageMutation] Message save settled');
      isSavingMessageRef.current = false;
    }
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
      // Cancel any outgoing refetches for both conversations and messages
      await queryClient.cancelQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [MESSAGES_QUERY_KEY] });
      
      // Cancel all analyses for this conversation immediately
      console.log('🛑 [useConversationsQuery] Cancelling analyses for conversation:', conversationId);
      cancelAnalysesForConversation(conversationId);
      
      // Snapshot the previous values
      const previousConversations = queryClient.getQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id]);
      const previousMessages = queryClient.getQueryData([MESSAGES_QUERY_KEY, conversationId]);
      
      // Clear messages cache immediately for the deleted conversation
      queryClient.removeQueries({ queryKey: [MESSAGES_QUERY_KEY, conversationId] });
      
      // Optimistically update to remove the conversation
      queryClient.setQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id], (old: Conversation[] = []) => {
        return old.filter((conv) => conv.id !== conversationId);
      });
      
      // Clear current conversation and messages immediately if it matches the deleted one
      if (currentConversation === conversationId) {
        console.log('🗑️ [useConversationsQuery] Clearing current conversation and messages for deletion');
        setCurrentConversation(null);
        setMessages([]);
      }
      
      return { previousConversations, previousMessages };
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
      // First check if conversation exists in database
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single();

      if (fetchError || !existingConversation) {
        console.log('⚠️ [updateTitleMutation] Conversation not found in database, skipping update');
        return; // Don't throw error, just skip the update
      }

      // Check if we should only update placeholder titles
      if (onlyIfPlaceholder && existingConversation.title && existingConversation.title !== 'New Visit') {
        console.log('⚠️ [updateTitleMutation] Skipping update - not a placeholder title');
        return;
      }

      console.log('🔄 [updateTitleMutation] Updating conversation title:', { conversationId, newTitle });

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
      const newConversation = createConversationMutation.data;
      
      console.log('🎯 [createConversationMutation.success] Setting current conversation:', newConversation.id);
      
      // Optimistically update cache instead of invalidating
      queryClient.setQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id], (old: Conversation[] = []) => {
        const exists = old.some(conv => conv.id === newConversation.id);
        if (exists) return old;
        return [newConversation, ...old];
      });
      
      setCurrentConversation(newConversation.id);
      lastValidConversationRef.current = newConversation.id;
      
      // Clear from recently created set after a grace period
      setTimeout(() => {
        recentlyCreatedConversationsRef.current.delete(newConversation.id);
        console.log('🧹 [createConversationMutation] Removed conversation from recent protection:', newConversation.id);
      }, 5000);
    }
    
    if (createConversationMutation.error) {
      logger.error('Error creating conversation:', createConversationMutation.error);
    }
  }, [createConversationMutation.isSuccess, createConversationMutation.data, createConversationMutation.error, queryClient, user?.id, selectedUser?.id]);

  // Validate current conversation belongs to user when conversations load - with mutation protection
  useEffect(() => {
    // Skip validation if mutations are in progress
    if (isCreatingConversationRef.current || isSavingMessageRef.current) {
      console.log('⏸️ [useConversationsQuery] Skipping ownership validation - mutations in progress');
      return;
    }
    
    // Only validate ownership if conversations are loaded and we have a current conversation
    if (!conversationsLoading && conversations && currentConversation) {
      const belongsToUser = conversations.some(conv => conv.id === currentConversation);
      const isRecentlyCreated = recentlyCreatedConversationsRef.current.has(currentConversation);
      
      console.log('🔍 [useConversationsQuery] Ownership validation:', {
        currentConversation,
        conversationsCount: conversations.length,
        belongsToUser,
        isRecentlyCreated,
        conversationsLoading,
        isCreating: isCreatingConversationRef.current,
        isSaving: isSavingMessageRef.current
      });
      
      // Don't clear recently created conversations or valid conversations
      if (!belongsToUser && !isRecentlyCreated) {
        console.log('🚫 [useConversationsQuery] Current conversation does not belong to user and is not recently created, clearing with delay');
        
        // Add a longer delay to prevent race conditions during rapid state changes
        conversationClearTimeoutRef.current = setTimeout(() => {
          // Double-check conditions before clearing
          if (!isCreatingConversationRef.current && !isSavingMessageRef.current) {
            console.log('⏰ [useConversationsQuery] Executing delayed conversation clear');
            setCurrentConversation(null);
            setMessages([]);
            lastValidConversationRef.current = null;
          } else {
            console.log('🛡️ [useConversationsQuery] Skipped delayed clear - mutations now in progress');
          }
        }, 250);
      } else {
        // Conversation is valid, update our ref
        lastValidConversationRef.current = currentConversation;
        
        // Clear any pending timeout since conversation is valid
        if (conversationClearTimeoutRef.current) {
          clearTimeout(conversationClearTimeoutRef.current);
          conversationClearTimeoutRef.current = null;
        }
      }
    } else if (conversationsLoading && currentConversation) {
      console.log('⏳ [useConversationsQuery] Conversations still loading, preserving current conversation:', currentConversation);
    }
  }, [conversations, currentConversation, conversationsLoading]);

  useEffect(() => {
    if (saveMessageMutation.isSuccess) {
      // Use targeted cache updates instead of blanket invalidation to prevent race conditions
      queryClient.invalidateQueries({ queryKey: [MESSAGES_QUERY_KEY, currentConversation] });
      
      // Update conversation timestamp in cache instead of invalidating
      if (currentConversation) {
        queryClient.setQueryData([CONVERSATIONS_QUERY_KEY, user?.id, selectedUser?.id], (old: Conversation[] = []) => {
          return old.map(conv => 
            conv.id === currentConversation 
              ? { ...conv, updated_at: new Date().toISOString() }
              : conv
          );
        });
      }
    }
    
    if (saveMessageMutation.error) {
      logger.error('Error saving message:', saveMessageMutation.error);
    }
  }, [saveMessageMutation.isSuccess, saveMessageMutation.error, queryClient, currentConversation, user?.id, selectedUser?.id]);

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

  // Sync messages state with fetched messages from React Query
  // Use a ref to prevent repeated clearing when conversation is already null
  const prevConversationRef = useRef<string | null>(currentConversation);
  
  useEffect(() => {
    const prevConversation = prevConversationRef.current;
    prevConversationRef.current = currentConversation;
    
    if (currentConversation === null) {
      // Only log and clear if we're actually transitioning from a conversation to null
      if (prevConversation !== null) {
        logger.info('🧹 [useConversationsQuery] Clearing messages - conversation closed');
        setMessages([]);
      }
    } else if (fetchedMessages && fetchedMessages.length >= 0) {
      logger.info(`🔄 [useConversationsQuery] Syncing messages state: ${fetchedMessages.length} messages`);
      setMessages(fetchedMessages);
    }
  }, [currentConversation, fetchedMessages]);

  const selectConversation = useCallback((conversationId: string) => {
    // Enhanced debug logging
    console.log('🎯 [selectConversation] Attempting to select conversation:', {
      conversationId,
      currentConversation,
      conversationsCount: conversations.length,
      conversationsLoading,
      userId: user?.id,
      patientId: selectedUser?.id
    });
    
    // If conversations are still loading, store the conversation ID for later recovery
    if (conversationsLoading) {
      console.log('⏳ [selectConversation] Conversations loading, storing for recovery:', conversationId);
      lastValidConversationRef.current = conversationId;
      setCurrentConversation(conversationId);
      return;
    }
    
    // Validate that the conversation belongs to the current user/patient combination
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.warn('🚫 [selectConversation] Cannot select conversation - not found in current conversations list:', {
        conversationId,
        availableConversations: conversations.map(c => c.id)
      });
      
      // Try to recover from last valid conversation if available
      if (lastValidConversationRef.current && lastValidConversationRef.current !== conversationId) {
        console.log('🔄 [selectConversation] Attempting recovery with last valid conversation:', lastValidConversationRef.current);
        const recoveryConversation = conversations.find(c => c.id === lastValidConversationRef.current);
        if (recoveryConversation) {
          setCurrentConversation(lastValidConversationRef.current);
          return;
        }
      }
      
      return;
    }
    
    console.log('✅ [selectConversation] Successfully selecting conversation:', conversationId);
    setCurrentConversation(conversationId);
    lastValidConversationRef.current = conversationId;
    
    // Clear any pending conversation clear timeouts
    if (conversationClearTimeoutRef.current) {
      clearTimeout(conversationClearTimeoutRef.current);
      conversationClearTimeoutRef.current = null;
    }
  }, [conversations, conversationsLoading, user?.id, selectedUser?.id]);

  const startNewConversation = useCallback(() => {
    console.log('📝 [startNewConversation] Starting new conversation');
    
    // Clear any pending timeouts
    if (conversationClearTimeoutRef.current) {
      clearTimeout(conversationClearTimeoutRef.current);
      conversationClearTimeoutRef.current = null;
    }
    
    setCurrentConversation(null);
    setMessages([]);
    lastValidConversationRef.current = null;
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

  // Cleanup effect for timeout refs
  useEffect(() => {
    return () => {
      // Clear any pending timeouts on unmount
      if (conversationClearTimeoutRef.current) {
        console.log('🧹 [useConversationsQuery] Cleaning up conversation clear timeout on unmount');
        clearTimeout(conversationClearTimeoutRef.current);
        conversationClearTimeoutRef.current = null;
      }
      
      if (mutationProtectionTimeoutRef.current) {
        console.log('🧹 [useConversationsQuery] Cleaning up mutation protection timeout on unmount');
        clearTimeout(mutationProtectionTimeoutRef.current);
        mutationProtectionTimeoutRef.current = null;
      }
    };
  }, []);

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
    saveMessage: async (conversationId: string, type: 'user' | 'ai', content: string, imageUrl?: string, products?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        saveMessageMutation.mutate({ conversationId, type, content, imageUrl, products }, {
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