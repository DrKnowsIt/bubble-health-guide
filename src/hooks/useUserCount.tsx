import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserCount = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching user count:', error);
        return;
      }

      if (count !== null) {
        setUserCount(count);
      }
    } catch (error) {
      console.error('Error fetching user count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCount();
    
    // Refresh count every 5 minutes
    const interval = setInterval(fetchUserCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { userCount, loading };
};