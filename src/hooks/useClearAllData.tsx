import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClearDataResult {
  success: boolean;
  message: string;
  deletedCounts?: Record<string, number>;
  totalDeleted?: number;
}

export const useClearAllData = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearAllDataMutation = useMutation({
    mutationFn: async (): Promise<ClearDataResult> => {
      const { data, error } = await supabase.functions.invoke('clear-all-data');
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh the UI
      const queriesToInvalidate = [
        'healthStats',
        'users', 
        'conversations',
        'healthRecords',
        'healthInsights',
        'comprehensiveHealthReports',
        'finalMedicalAnalysis',
        'doctorNotes',
        'easyChatSessions',
        'conversationMemory',
        'conversationDiagnoses',
        'conversationSolutions'
      ];

      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      // Also remove all cached queries to ensure fresh data
      queryClient.removeQueries();

      toast({
        title: "Data Cleared Successfully",
        description: `All your data has been permanently deleted. ${data.totalDeleted || 0} records removed.`,
      });
    },
    onError: (error: any) => {
      console.error('Clear all data error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Clear Data",
        description: error.message || "An error occurred while clearing your data. Please try again.",
      });
    },
    onSettled: () => {
      setIsClearing(false);
    }
  });

  const clearAllData = async () => {
    setIsClearing(true);
    clearAllDataMutation.mutate();
  };

  return {
    clearAllData,
    isClearing,
    error: clearAllDataMutation.error,
    isSuccess: clearAllDataMutation.isSuccess
  };
};