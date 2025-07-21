import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface HealthStats {
  totalRecords: number;
  totalConversations: number;
  lastActivityTime: string | null;
  loading: boolean;
}

export const useHealthStats = (): HealthStats => {
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
        // Get health records count
        const { count: recordsCount, error: recordsError } = await supabase
          .from('health_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (recordsError) throw recordsError;

        // Get conversations count
        const { count: conversationsCount, error: conversationsError } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (conversationsError) throw conversationsError;

        // Get last activity from conversations
        const { data: lastConversation, error: lastActivityError } = await supabase
          .from('conversations')
          .select('updated_at')
          .eq('user_id', user.id)
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
  }, [user]);

  return stats;
};