import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface HealthDataPriority {
  id: string;
  data_type: string;
  priority_level: 'always' | 'conditional' | 'minimal';
  subscription_tier: string | null;
}

interface DoctorNote {
  id: string;
  note_type: 'pattern' | 'concern' | 'preference' | 'insight';
  title: string;
  content: string;
  confidence_score: number | null;
  conversation_context: any;
  is_active: boolean;
  patient_id: string | null;
}

interface HealthRecordSummary {
  id: string;
  health_record_id: string;
  summary_text: string;
  priority_level: 'always' | 'conditional' | 'normal';
  health_record?: any;
}

export const useStrategicReferencing = (patientId?: string | null) => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  const [priorities, setPriorities] = useState<HealthDataPriority[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [summaries, setSummaries] = useState<HealthRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch health data priorities
  const fetchPriorities = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('health_data_priorities')
      .select('*')
      .eq('user_id', user.id)
      .or(`subscription_tier.is.null,subscription_tier.eq.${subscription_tier || 'basic'}`);

    if (error) {
      console.error('Error fetching priorities:', error);
      return;
    }

    setPriorities((data || []) as HealthDataPriority[]);
  };

  // Fetch doctor notes
  const fetchDoctorNotes = async () => {
    if (!user) return;

    let query = supabase
      .from('doctor_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.or(`patient_id.is.null,patient_id.eq.${patientId}`);
    } else {
      query = query.is('patient_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching doctor notes:', error);
      return;
    }

    setDoctorNotes((data || []) as DoctorNote[]);
  };

  // Fetch health record summaries
  const fetchSummaries = async () => {
    if (!user) return;

    let healthRecordsQuery = supabase
      .from('health_records')
      .select(`
        id,
        title,
        record_type,
        data,
        created_at,
        health_record_summaries!inner(
          id,
          summary_text,
          priority_level
        )
      `)
      .eq('user_id', user.id);

    if (patientId) {
      healthRecordsQuery = healthRecordsQuery.eq('patient_id', patientId);
    } else {
      healthRecordsQuery = healthRecordsQuery.is('patient_id', null);
    }

    const { data, error } = await healthRecordsQuery;

    if (error) {
      console.error('Error fetching summaries:', error);
      return;
    }

    // Transform the data to flat structure
    const summariesData = data?.map(record => ({
      id: record.health_record_summaries[0]?.id || '',
      health_record_id: record.id,
      summary_text: record.health_record_summaries[0]?.summary_text || '',
      priority_level: (record.health_record_summaries[0]?.priority_level || 'normal') as 'always' | 'conditional' | 'normal',
      health_record: {
        title: record.title,
        record_type: record.record_type,
        data: record.data,
        created_at: record.created_at
      }
    })) || [];

    setSummaries(summariesData);
  };

  // Create a new doctor note
  const createDoctorNote = async (note: Omit<DoctorNote, 'id'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('doctor_notes')
      .insert({
        user_id: user.id,
        patient_id: patientId || null,
        ...note
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating doctor note:', error);
      return null;
    }

    await fetchDoctorNotes();
    return data;
  };

  // Update a doctor note
  const updateDoctorNote = async (id: string, updates: Partial<DoctorNote>) => {
    const { data, error } = await supabase
      .from('doctor_notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user?.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating doctor note:', error);
      return null;
    }

    await fetchDoctorNotes();
    return data;
  };

  // Get strategic context for AI
  const getStrategicContext = () => {
    const currentTier = subscription_tier || 'basic';
    
    // Get always-priority data
    const alwaysPriorities = priorities.filter(p => p.priority_level === 'always');
    const conditionalPriorities = priorities.filter(p => p.priority_level === 'conditional');

    // Determine what to include based on subscription
    const shouldIncludeConditional = currentTier === 'pro' || 
      (currentTier === 'basic' && conditionalPriorities.length > 0);

    // Get relevant summaries
    const alwaysSummaries = summaries.filter(s => s.priority_level === 'always');
    const conditionalSummaries = summaries.filter(s => s.priority_level === 'conditional');
    const normalSummaries = summaries.filter(s => s.priority_level === 'normal');

    // Filter doctor notes by relevance
    const patternNotes = doctorNotes.filter(n => n.note_type === 'pattern');
    const concernNotes = doctorNotes.filter(n => n.note_type === 'concern');
    const preferenceNotes = doctorNotes.filter(n => n.note_type === 'preference');
    const insightNotes = doctorNotes.filter(n => n.note_type === 'insight');

    return {
      subscription_tier: currentTier,
      always_reference: {
        summaries: alwaysSummaries,
        data_types: alwaysPriorities.map(p => p.data_type)
      },
      conditional_reference: shouldIncludeConditional ? {
        summaries: conditionalSummaries,
        data_types: conditionalPriorities.map(p => p.data_type)
      } : null,
      normal_summaries: normalSummaries.slice(0, 5), // Limit to most recent 5
      doctor_notes: {
        patterns: patternNotes.slice(0, 3),
        concerns: concernNotes.slice(0, 3),
        preferences: preferenceNotes.slice(0, 2),
        insights: insightNotes.slice(0, 3)
      },
      total_records: summaries.length
    };
  };

  // Generate summary for a health record
  const generateSummary = async (healthRecordId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('summarize-health-records', {
        body: { health_record_id: healthRecordId }
      });

      if (error) throw error;

      await fetchSummaries();
      return data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchPriorities(),
        fetchDoctorNotes(),
        fetchSummaries()
      ]).finally(() => setLoading(false));
    }
  }, [user, patientId, subscription_tier]);

  return {
    priorities,
    doctorNotes,
    summaries,
    loading,
    getStrategicContext,
    createDoctorNote,
    updateDoctorNote,
    generateSummary,
    refetch: () => {
      fetchPriorities();
      fetchDoctorNotes();
      fetchSummaries();
    }
  };
};