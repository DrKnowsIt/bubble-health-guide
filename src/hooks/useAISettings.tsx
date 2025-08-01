import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AISettings {
  id: string;
  user_id: string;
  personalization_level: string;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useAISettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch AI settings for the current user
  const fetchSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('ai_settings')
            .insert([{
              user_id: user.id,
              personalization_level: 'medium',
              memory_enabled: true
            }])
            .select()
            .single();

          if (createError) throw createError;
          setSettings(newSettings);
        } else {
          throw error;
        }
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update AI settings
  const updateSettings = async (updates: Partial<{personalization_level: string; memory_enabled: boolean}>) => {
    if (!user || !settings) return false;

    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      return true;
    } catch (error) {
      console.error('Error updating AI settings:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: fetchSettings
  };
};