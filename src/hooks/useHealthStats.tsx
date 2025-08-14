import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  // Add other user properties as needed
}

export const useHealthStats = (selectedUser?: User | null): HealthStats => {
  const { user } = useAuth();
  const [stats, setStats] = useState<HealthStats>({
    totalRecords: 0,
    totalConversations: 0,
    lastActivityTime: null,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setStats({
        totalRecords: 0,
        totalConversations: 0,
        lastActivityTime: null,
        loading: false
      });
      return;
    }

    const fetchStats = async () => {
      try {
        // Build health records query - filter by patient if selected
        let recordsQuery = supabase
          .from('health_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (selectedUser?.id) {
          recordsQuery = recordsQuery.eq('patient_id', selectedUser.id);
        }

        const { count: recordsCount, error: recordsError } = await recordsQuery;
        if (recordsError) throw recordsError;

        // Build conversations query - filter by patient if selected
        let conversationsQuery = supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (selectedUser?.id) {
          conversationsQuery = conversationsQuery.eq('patient_id', selectedUser.id);
        }

        const { count: conversationsCount, error: conversationsError } = await conversationsQuery;
        if (conversationsError) throw conversationsError;

        // Get last activity from conversations - filter by patient if selected
        let lastActivityQuery = supabase
          .from('conversations')
          .select('updated_at')
          .eq('user_id', user.id);
          
        if (selectedUser?.id) {
          lastActivityQuery = lastActivityQuery.eq('patient_id', selectedUser.id);
        }
        
        const { data: lastConversation, error: lastActivityError } = await lastActivityQuery
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (lastActivityError && lastActivityError.code !== 'PGRST116') {
          throw lastActivityError;
        }

        setStats({
          totalRecords: recordsCount || 0,
          totalConversations: conversationsCount || 0,
          lastActivityTime: lastConversation?.updated_at || null,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching health stats:', error);
        setStats({
          totalRecords: 0,
          totalConversations: 0,
          lastActivityTime: null,
          loading: false
        });
      }
    };

    fetchStats();
  }, [user, selectedUser?.id]);

  return stats;
};