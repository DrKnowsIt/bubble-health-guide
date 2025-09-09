import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface HealthEpisode {
  id: string;
  user_id: string;
  patient_id?: string;
  episode_title: string;
  episode_description?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'doctor_reviewed' | 'archived';
  episode_type: 'symptoms' | 'followup' | 'routine_check' | 'emergency';
  created_at: string;
  updated_at: string;
}

export interface DoctorConfirmation {
  id: string;
  user_id: string;
  patient_id?: string;
  health_episode_id?: string;
  confirmation_type: string;
  confirmed_diagnosis?: string;
  doctor_notes?: string;
  confidence_level: 'confirmed' | 'suspected' | 'ruled_out';
  confirmation_date: string;
  next_followup_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmedMedicalHistory {
  id: string;
  user_id: string;
  patient_id?: string;
  condition_name: string;
  diagnosis_date?: string;
  confirmed_by_doctor: boolean;
  doctor_confirmation_id?: string;
  severity?: string;
  status: 'active' | 'resolved' | 'chronic' | 'managed';
  notes?: string;
  last_reviewed_date?: string;
  created_at: string;
  updated_at: string;
}

export const useHealthEpisodes = (selectedPatientId?: string) => {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<HealthEpisode[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<HealthEpisode | null>(null);
  const [doctorConfirmations, setDoctorConfirmations] = useState<DoctorConfirmation[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<ConfirmedMedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEpisodes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('health_episodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedPatientId) {
        query = query.eq('patient_id', selectedPatientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEpisodes((data || []) as HealthEpisode[]);
    } catch (error) {
      console.error('Error fetching health episodes:', error);
      toast.error('Failed to load health episodes');
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPatientId]);

  const fetchMedicalHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('confirmed_medical_history')
        .select('*')
        .eq('user_id', user.id)
        .order('diagnosis_date', { ascending: false });

      if (selectedPatientId) {
        query = query.eq('patient_id', selectedPatientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMedicalHistory((data || []) as ConfirmedMedicalHistory[]);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    }
  }, [user?.id, selectedPatientId]);

  const createEpisode = async (episodeData: Partial<HealthEpisode>) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('health_episodes')
        .insert({
          user_id: user.id,
          patient_id: selectedPatientId,
          ...episodeData
        } as any)
        .select()
        .single();

      if (error) throw error;

      setEpisodes(prev => [data as HealthEpisode, ...prev]);
      setActiveEpisode(data as HealthEpisode);
      toast.success('Health episode created');
      return data;
    } catch (error) {
      console.error('Error creating episode:', error);
      toast.error('Failed to create health episode');
      throw error;
    }
  };

  const updateEpisode = async (id: string, updates: Partial<HealthEpisode>) => {
    try {
      const { data, error } = await supabase
        .from('health_episodes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEpisodes(prev => prev.map(ep => ep.id === id ? data as HealthEpisode : ep));
      if (activeEpisode?.id === id) {
        setActiveEpisode(data as HealthEpisode);
      }
      
      toast.success('Episode updated');
      return data;
    } catch (error) {
      console.error('Error updating episode:', error);
      toast.error('Failed to update episode');
      throw error;
    }
  };

  const createDoctorConfirmation = async (confirmationData: Partial<DoctorConfirmation>) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('doctor_confirmations')
        .insert({
          user_id: user.id,
          patient_id: selectedPatientId,
          ...confirmationData
        } as any)
        .select()
        .single();

      if (error) throw error;

      setDoctorConfirmations(prev => [data as DoctorConfirmation, ...prev]);
      toast.success('Doctor confirmation added');
      return data;
    } catch (error) {
      console.error('Error creating doctor confirmation:', error);
      toast.error('Failed to add doctor confirmation');
      throw error;
    }
  };

  const createMedicalHistoryEntry = async (historyData: Partial<ConfirmedMedicalHistory>) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('confirmed_medical_history')
        .insert({
          user_id: user.id,
          patient_id: selectedPatientId,
          ...historyData
        } as any)
        .select()
        .single();

      if (error) throw error;

      setMedicalHistory(prev => [data as ConfirmedMedicalHistory, ...prev]);
      toast.success('Medical history entry added');
      return data;
    } catch (error) {
      console.error('Error creating medical history entry:', error);
      toast.error('Failed to add medical history entry');
      throw error;
    }
  };

  const completeEpisode = async (episodeId: string) => {
    try {
      await updateEpisode(episodeId, { 
        status: 'doctor_reviewed',
        end_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error completing episode:', error);
    }
  };

  useEffect(() => {
    fetchEpisodes();
    fetchMedicalHistory();
  }, [fetchEpisodes, fetchMedicalHistory]);

  return {
    episodes,
    activeEpisode,
    setActiveEpisode,
    doctorConfirmations,
    medicalHistory,
    loading,
    createEpisode,
    updateEpisode,
    createDoctorConfirmation,
    createMedicalHistoryEntry,
    completeEpisode,
    fetchEpisodes,
    fetchMedicalHistory
  };
};