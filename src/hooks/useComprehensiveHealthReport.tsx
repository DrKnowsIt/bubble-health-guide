import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TestRecommendation {
  test_name: string;
  test_code?: string;
  category: string;
  reason: string;
  urgency: string;
  confidence: number;
  contraindications?: string[];
  estimated_cost_range?: string;
  patient_prep_required?: boolean;
  related_concerns?: string[];
}

interface ComprehensiveHealthReport {
  id: string;
  user_id: string;
  patient_id: string | null;
  overall_health_status: string;
  key_concerns: string[];
  recommendations: string[];
  recommended_tests: TestRecommendation[];
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

  const checkIfReportNeedsRegeneration = useCallback(async (existingReport: ComprehensiveHealthReport) => {
    if (!user) return true;
    
    const reportDate = new Date(existingReport.updated_at);
    
    try {
      // Check for newer health records
      const { data: newHealthRecords } = await supabase
        .from('health_records')
        .select('updated_at')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUser?.id || null)
        .gte('updated_at', reportDate.toISOString())
        .limit(1);

      if (newHealthRecords && newHealthRecords.length > 0) {
        console.log('Found newer health records since last report');
        return true;
      }

      // Check for new conversations/messages
      const { data: newMessages } = await supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', reportDate.toISOString())
        .limit(1);

      if (newMessages && newMessages.length > 0) {
        console.log('Found newer messages since last report');
        return true;
      }

      // Check for updated conversation memory
      const { data: newMemory } = await supabase
        .from('conversation_memory')
        .select('updated_at')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUser?.id || null)
        .gte('updated_at', reportDate.toISOString())
        .limit(1);

      if (newMemory && newMemory.length > 0) {
        console.log('Found newer conversation memory since last report');
        return true;
      }

      console.log('No new data found, existing report is current');
      return false;
    } catch (error) {
      console.error('Error checking report freshness:', error);
      return true; // Err on the side of regeneration
    }
  }, [user?.id, selectedUser?.id]);

  const fetchReport = useCallback(async () => {
    if (!user) {
      setReport(null);
      return;
    }

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
        setReport(null);
      } else {
        setReport(data ? {
          ...data,
          recommended_tests: (data.recommended_tests as any) || []
        } as ComprehensiveHealthReport : null);
      }
    } catch (error) {
      console.error('Error in fetchReport:', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedUser?.id]);

  const generateReport = async (forceRegeneration = false) => {
    if (!user || generating) return;

    // Check if we have an existing report and whether it needs regeneration
    if (!forceRegeneration && report) {
      const needsRegeneration = await checkIfReportNeedsRegeneration(report);
      if (!needsRegeneration) {
        console.log('Report is current, skipping regeneration');
        return { report, cached: true };
      }
    }

    setGenerating(true);
    try {
      console.log('Generating new comprehensive health report...');
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
      
      return { data, cached: false };
    } catch (error) {
      console.error('Error in generateReport:', error);
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  // Memoize the color functions to prevent unnecessary re-renders
  const getStatusColor = useMemo(() => (status: string) => {
    switch (status?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'concerning':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800';
    }
  }, []);

  const getPriorityColor = useMemo(() => (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800';
      case 'moderate':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800';
      case 'normal':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800';
    }
  }, []);

  const isReportOutdated = useCallback(async () => {
    if (!report) return true;
    
    // First check age-based staleness (7 days)
    const reportDate = new Date(report.updated_at);
    const now = new Date();
    const daysDiff = (now.getTime() - reportDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysDiff > 7) {
      return true; // Report is too old
    }
    
    // Then check if source data has changed
    return await checkIfReportNeedsRegeneration(report);
  }, [report, checkIfReportNeedsRegeneration]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Debounce the fetch to prevent rapid re-fetches
    timeoutId = setTimeout(() => {
      fetchReport();
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchReport]);

  return {
    report,
    loading,
    generating,
    generateReport,
    refetch: fetchReport,
    getStatusColor,
    getPriorityColor,
    isReportOutdated,
    checkIfReportNeedsRegeneration
  };
};