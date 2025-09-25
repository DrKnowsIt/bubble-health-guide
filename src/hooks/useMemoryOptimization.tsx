import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MemoryCleanupOptions {
  maxMemoryAge: number; // days
  maxConversationLength: number; // messages
  compressionThreshold: number; // conversation length that triggers compression
}

interface MemoryStats {
  totalMemorySize: number;
  oldestMemoryDate: string | null;
  largestConversation: number;
  compressibleConversations: number;
}

export const useMemoryOptimization = (options: MemoryCleanupOptions = {
  maxMemoryAge: 90, // 3 months
  maxConversationLength: 1000,
  compressionThreshold: 100
}) => {
  const { user } = useAuth();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  const getMemoryStats = useCallback(async (): Promise<MemoryStats | null> => {
    if (!user?.id) return null;

    try {
      // Get memory statistics
      const { data: memories } = await supabase
        .from('conversation_memory')
        .select('memory, created_at, conversation_id')
        .eq('user_id', user.id);

      if (!memories || memories.length === 0) return null;

      // Calculate stats
      const totalMemorySize = memories.reduce((size, mem) => 
        size + JSON.stringify(mem.memory || {}).length, 0
      );

      const dates = memories.map(m => new Date(m.created_at)).sort();
      const oldestMemoryDate = dates.length > 0 ? dates[0].toISOString() : null;

      // Get conversation message counts for the conversations we have memory for
      const conversationIds = memories.map(m => m.conversation_id).filter(Boolean);
      
      if (conversationIds.length === 0) {
        return {
          totalMemorySize,
          oldestMemoryDate,
          largestConversation: 0,
          compressibleConversations: 0
        };
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds);

      const conversationSizes = (messages || []).reduce((acc, msg) => {
        const id = msg.conversation_id;
        if (id) {
          acc[id] = (acc[id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const sizes = Object.values(conversationSizes);
      const largestConversation = sizes.length > 0 ? Math.max(...sizes) : 0;
      const compressibleConversations = sizes.filter(size => size > options.compressionThreshold).length;

      return {
        totalMemorySize,
        oldestMemoryDate,
        largestConversation,
        compressibleConversations
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return null;
    }
  }, [user?.id, options.compressionThreshold]);

  const cleanupOldMemory = useCallback(async () => {
    if (!user?.id) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.maxMemoryAge);

    try {
      // Delete old conversation memory
      const { error: memoryError } = await supabase
        .from('conversation_memory')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString());

      if (memoryError) {
        console.error('Error cleaning up old memory:', memoryError);
        return;
      }

      // Clean up related old diagnoses and health topics
      const { error: diagnosesError } = await supabase
        .from('conversation_diagnoses')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString());

      const { error: topicsError } = await supabase
        .from('health_topics_for_discussion')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', cutoffDate.toISOString());

      if (diagnosesError) console.warn('Error cleaning diagnoses:', diagnosesError);
      if (topicsError) console.warn('Error cleaning topics:', topicsError);

      console.log(`Cleaned up memory older than ${options.maxMemoryAge} days`);
    } catch (error) {
      console.error('Error in memory cleanup:', error);
    }
  }, [user?.id, options.maxMemoryAge]);

  const compressLongConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all conversations for this user first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      if (!conversations || conversations.length === 0) return;

      // Check each conversation's message count
      for (const conversation of conversations) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false });

        if (messages && messages.length > options.maxConversationLength) {
          // Keep only the most recent messages
          const messagesToKeep = messages.slice(0, options.maxConversationLength);
          const messagesToDelete = messages.slice(options.maxConversationLength);
          const messageIdsToDelete = messagesToDelete.map(m => m.id);

          if (messageIdsToDelete.length > 0) {
            await supabase
              .from('messages')
              .delete()
              .in('id', messageIdsToDelete);

            console.log(`Compressed conversation ${conversation.id}: removed ${messageIdsToDelete.length} old messages`);
          }
        }
      }

      console.log('Compressed long conversations');
    } catch (error) {
      console.error('Error compressing conversations:', error);
    }
  }, [user?.id, options.maxConversationLength]);

  const optimizeMemory = useCallback(async () => {
    if (!user?.id || isOptimizing) return;

    setIsOptimizing(true);
    try {
      console.log('Starting memory optimization...');
      
      // Get stats before optimization
      const beforeStats = await getMemoryStats();
      
      // Run cleanup operations
      await Promise.all([
        cleanupOldMemory(),
        compressLongConversations()
      ]);
      
      // Get stats after optimization
      const afterStats = await getMemoryStats();
      setStats(afterStats);
      
      console.log('Memory optimization completed', {
        before: beforeStats,
        after: afterStats
      });
      
    } catch (error) {
      console.error('Error during memory optimization:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [user?.id, isOptimizing, getMemoryStats, cleanupOldMemory, compressLongConversations]);

  const schedulePeriodicCleanup = useCallback(() => {
    // Clear existing timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    // Schedule cleanup every 24 hours
    cleanupTimeoutRef.current = setTimeout(() => {
      optimizeMemory();
      schedulePeriodicCleanup(); // Reschedule
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, [optimizeMemory]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
  }, []);

  return {
    isOptimizing,
    stats,
    optimizeMemory,
    getMemoryStats,
    cleanupOldMemory,
    compressLongConversations,
    schedulePeriodicCleanup,
    cleanup
  };
};
