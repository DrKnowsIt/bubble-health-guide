import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface FinalMedicalAnalysis {
  id: string;
  user_id: string;
  patient_id: string;
  analysis_summary: string;
  key_findings: Array<{
    finding: string;
    evidence: string;
    significance: string;
    confidence: number;
  }>;
  doctor_test_recommendations: Array<{
    test_name: string;
    test_code?: string;
    category: string;
    urgency: string;
    reason: string;
    confidence: number;
    estimated_cost_range?: string;
    patient_prep_required?: boolean;
    contraindications?: string[];
  }>;
  holistic_assessment: string;
  risk_assessment: string;
  clinical_insights: {
    patterns_identified?: string[];
    symptom_clusters?: string[];
    timeline_analysis?: string;
  };
  follow_up_recommendations: string[];
  priority_level: string;
  confidence_score: number;
  data_sources_analyzed: {
    conversation_memories: number;
    diagnoses: number;
    solutions: number;
    health_records: number;
    insights: number;
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export const useFinalMedicalAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinalMedicalAnalysis | null>(null);
  const { user } = useAuth();

  const generateFinalAnalysis = useCallback(async (selectedUser: User) => {
    if (!user || !selectedUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User authentication required"
      });
      return null;
    }

    setLoading(true);
    
    try {
      console.log('Starting final medical analysis generation');
      
      // Call the edge function to generate comprehensive analysis
      const { data, error } = await supabase.functions.invoke('generate-final-medical-analysis', {
        body: {
          patient_id: selectedUser.id,
          user_id: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate final analysis');
      }

      if (!data?.success || !data?.analysis) {
        throw new Error('Invalid response from analysis service');
      }

      console.log('Final medical analysis generated successfully');
      const typedAnalysis: FinalMedicalAnalysis = {
        ...data.analysis,
        key_findings: (data.analysis.key_findings as any[]) || [],
        doctor_test_recommendations: (data.analysis.doctor_test_recommendations as any[]) || [],
        clinical_insights: (data.analysis.clinical_insights as any) || {},
        data_sources_analyzed: (data.analysis.data_sources_analyzed as any) || {},
        follow_up_recommendations: (data.analysis.follow_up_recommendations as string[]) || []
      };
      
      setAnalysis(typedAnalysis);
      
      toast({
        title: "Analysis Complete",
        description: `Comprehensive medical analysis for ${selectedUser.first_name} ${selectedUser.last_name} has been generated.`
      });

      return typedAnalysis;

    } catch (error) {
      console.error('Error generating final analysis:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to generate comprehensive analysis. Please try again."
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLatestAnalysis = useCallback(async (selectedUser: User) => {
    if (!user || !selectedUser) return null;

    try {
      const { data, error } = await supabase
        .from('final_medical_analysis')
        .select('*')
        .eq('user_id', user.id)
        .eq('patient_id', selectedUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching latest analysis:', error);
        return null;
      }

      if (data) {
        const typedAnalysis: FinalMedicalAnalysis = {
          ...data,
          key_findings: (data.key_findings as any[]) || [],
          doctor_test_recommendations: (data.doctor_test_recommendations as any[]) || [],
          clinical_insights: (data.clinical_insights as any) || {},
          data_sources_analyzed: (data.data_sources_analyzed as any) || {},
          follow_up_recommendations: (data.follow_up_recommendations as string[]) || []
        };
        
        setAnalysis(typedAnalysis);
        return typedAnalysis;
      }

      return null;
    } catch (error) {
      console.error('Error fetching analysis:', error);
      return null;
    }
  }, [user]);

  return {
    loading,
    analysis,
    generateFinalAnalysis,
    fetchLatestAnalysis
  };
};