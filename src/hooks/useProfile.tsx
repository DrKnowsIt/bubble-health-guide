import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  medical_disclaimer_accepted?: boolean;
  medical_disclaimer_accepted_at?: string;
  alpha_tester: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const checkLegalAgreementStatus = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('medical_disclaimer_accepted')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking legal agreement status:', error);
        return false;
      }

      return data?.medical_disclaimer_accepted || false;
    } catch (error) {
      console.error('Error checking legal agreement status:', error);
      return false;
    }
  }, [user?.id]);

  const updateLegalAgreementStatus = useCallback(async (accepted: boolean) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      const updateData = {
        medical_disclaimer_accepted: accepted,
        medical_disclaimer_accepted_at: accepted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating legal agreement status:', error);
        throw error;
      }

      // Update local profile state if it exists
      if (profile) {
        setProfile(prev => prev ? { 
          ...prev, 
          medical_disclaimer_accepted: accepted,
          medical_disclaimer_accepted_at: accepted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        } : null);
      }

      return true;
    } catch (error) {
      console.error('Error updating legal agreement status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    profile,
    loading,
    fetchProfile,
    checkLegalAgreementStatus,
    updateLegalAgreementStatus,
    updateProfile
  };
};