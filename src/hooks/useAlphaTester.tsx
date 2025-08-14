import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TESTER_CODE = "DRKNOWSIT_ALPHA_2024";

export const useAlphaTester = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const activateTesterMode = async (code: string) => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      });
      return false;
    }

    if (code !== TESTER_CODE) {
      toast({
        title: "Invalid Code",
        description: "The tester code you entered is invalid",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ alpha_tester: true })
        .eq('email', user.email);

      if (error) {
        console.error('Error activating tester mode:', error);
        toast({
          title: "Error",
          description: "Failed to activate tester mode",
          variant: "destructive",
        });
        return false;
      }

      setIsAlphaTester(true);
      toast({
        title: "Tester Mode Activated",
        description: "You now have access to alpha testing features",
      });
      return true;
    } catch (error) {
      console.error('Error activating tester mode:', error);
      toast({
        title: "Error",
        description: "Failed to activate tester mode",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleTesterMode = async (enabled: boolean) => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ alpha_tester: enabled })
        .eq('email', user.email);

      if (error) {
        console.error('Error toggling tester mode:', error);
        toast({
          title: "Error",
          description: "Failed to update tester mode",
          variant: "destructive",
        });
        return false;
      }

      setIsAlphaTester(enabled);
      toast({
        title: enabled ? "Tester Mode Enabled" : "Tester Mode Disabled",
        description: enabled 
          ? "Alpha testing features are now available" 
          : "Alpha testing features are now disabled",
      });
      return true;
    } catch (error) {
      console.error('Error toggling tester mode:', error);
      toast({
        title: "Error",
        description: "Failed to update tester mode",
        variant: "destructive",
      });
      return false;
    }
  };

  return { isAlphaTester, loading, activateTesterMode, toggleTesterMode };
};