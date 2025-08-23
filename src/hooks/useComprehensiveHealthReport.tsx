import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ComprehensiveHealthReport {
  id: string;
  user_id: string;
  patient_id: string | null;
  overall_health_status: string;
  key_concerns: string[];
  recommendations: string[];
  priority_level: string;
  demographics_summary: any;
  health_metrics_summary: any;
  report_summary: string;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export const useComprehensiveHealthReport = (selectedUser?: User | null) => {
  const { user } = useAuth();
  const [report, setReport] = useState<ComprehensiveHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comprehensive_health_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUser?.id || null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching comprehensive health report:', error);
      } else {
        setReport(data);
      }
    } catch (error) {
      console.error('Error in fetchReport:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!user || generating) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-comprehensive-health-report', {
        body: {
          patient_id: selectedUser?.id || null
        }
      });

      if (error) {
        console.error('Error generating comprehensive health report:', error);
        throw error;
      }

      // Refresh the report after generation
      await fetchReport();
      
      return data;
    } catch (error) {
      console.error('Error in generateReport:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50';
      case 'concerning':
        return 'text-orange-600 bg-orange-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'moderate':
        return 'text-orange-600 bg-orange-50';
      case 'normal':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isReportOutdated = () => {
    if (!report) return true;
    
    const reportDate = new Date(report.updated_at);
    const now = new Date();
    const daysDiff = (now.getTime() - reportDate.getTime()) / (1000 * 3600 * 24);
    
    // Consider report outdated if it's more than 7 days old
    return daysDiff > 7;
  };

  useEffect(() => {
    fetchReport();
  }, [user, selectedUser]);

  return {
    report,
    loading,
    generating,
    generateReport,
    refetch: fetchReport,
    getStatusColor,
    getPriorityColor,
    isReportOutdated
  };
};