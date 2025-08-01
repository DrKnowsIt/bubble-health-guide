import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useAlphaTester = () => {
  const { user } = useAuth();
  const [isAlphaTester, setIsAlphaTester] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAlphaTesterStatus = async () => {
      if (!user?.email) {
        setIsAlphaTester(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('alpha_tester')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Error checking alpha tester status:', error);
          setIsAlphaTester(false);
        } else {
          setIsAlphaTester(data?.alpha_tester || false);
        }
      } catch (error) {
        console.error('Error checking alpha tester status:', error);
        setIsAlphaTester(false);
      } finally {
        setLoading(false);
      }
    };

    checkAlphaTesterStatus();
  }, [user]);

  return { isAlphaTester, loading };
};