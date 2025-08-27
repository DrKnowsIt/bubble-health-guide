import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';

interface HealthStats {
  totalRecords: number;
  totalConversations: number;
  lastActivityTime: string | null;
  loading: boolean;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

const HEALTH_STATS_QUERY_KEY = 'healthStats';

export const useHealthStatsQuery = (selectedUser?: User | null): HealthStats => {
  const { user } = useAuth();

  const {
    data = {
      totalRecords: 0,
      totalConversations: 0,
      lastActivityTime: null,
    },
    isLoading: loading,
  } = useQuery({
    queryKey: [HEALTH_STATS_QUERY_KEY, user?.id, selectedUser?.id],
    queryFn: async () => {
      if (!user) {
        return {
          totalRecords: 0,
          totalConversations: 0,
          lastActivityTime: null,
        };
      }

      // Batch all queries for better performance
      const queries = [];

      // Health records query
      let recordsQuery = supabase
        .from('health_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (selectedUser?.id) {
        recordsQuery = recordsQuery.eq('patient_id', selectedUser.id);
      }
      queries.push(recordsQuery);

      // Conversations query
      let conversationsQuery = supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (selectedUser?.id) {
        conversationsQuery = conversationsQuery.eq('patient_id', selectedUser.id);
      }
      queries.push(conversationsQuery);

      // Last activity query
      let lastActivityQuery = supabase
        .from('conversations')
        .select('updated_at')
        .eq('user_id', user.id);
        
      if (selectedUser?.id) {
        lastActivityQuery = lastActivityQuery.eq('patient_id', selectedUser.id);
      }
      
      lastActivityQuery = lastActivityQuery
        .order('updated_at', { ascending: false })
        .limit(1);
      queries.push(lastActivityQuery);

      // Execute all queries in parallel
      const [
        { count: recordsCount, error: recordsError },
        { count: conversationsCount, error: conversationsError },
        { data: lastConversation, error: lastActivityError }
      ] = await Promise.all(queries);

      if (recordsError) throw recordsError;
      if (conversationsError) throw conversationsError;
      if (lastActivityError && lastActivityError.code !== 'PGRST116') {
        throw lastActivityError;
      }

      return {
        totalRecords: recordsCount || 0,
        totalConversations: conversationsCount || 0,
        lastActivityTime: lastConversation?.[0]?.updated_at || null,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...data,
    loading,
  };
};