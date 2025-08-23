import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HealthInsight {
  id: string;
  user_id: string;
  patient_id: string | null;
  health_record_id: string;
  insight_type: 'abnormal' | 'concerning' | 'risk_factor' | 'symptom';
  severity_level: 'urgent' | 'moderate' | 'watch';
  title: string;
  description: string;
  recommendation: string | null;
  confidence_score: number | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useHealthInsights = (patientId?: string | null) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('health_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        query = query.is('patient_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching health insights:', error);
        return;
      }

      setInsights((data || []) as HealthInsight[]);
    } catch (error) {
      console.error('Error fetching health insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('health_insights')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error acknowledging insight:', error);
        return false;
      }

      // Update local state
      setInsights(prev => 
        prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, is_acknowledged: true, acknowledged_at: new Date().toISOString() }
            : insight
        )
      );

      return true;
    } catch (error) {
      console.error('Error acknowledging insight:', error);
      return false;
    }
  };

  const deleteInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('health_insights')
        .delete()
        .eq('id', insightId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error deleting insight:', error);
        return false;
      }

      // Update local state
      setInsights(prev => prev.filter(insight => insight.id !== insightId));
      return true;
    } catch (error) {
      console.error('Error deleting insight:', error);
      return false;
    }
  };

  const getInsightsByPriority = () => {
    const urgent = insights.filter(i => i.severity_level === 'urgent' && !i.is_acknowledged);
    const moderate = insights.filter(i => i.severity_level === 'moderate' && !i.is_acknowledged);
    const watch = insights.filter(i => i.severity_level === 'watch' && !i.is_acknowledged);
    
    return { urgent, moderate, watch };
  };

  const getUnacknowledgedCount = () => {
    return insights.filter(i => !i.is_acknowledged).length;
  };

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user, patientId]);

  return {
    insights,
    loading,
    acknowledgeInsight,
    deleteInsight,
    getInsightsByPriority,
    getUnacknowledgedCount,
    refetch: fetchInsights
  };
};