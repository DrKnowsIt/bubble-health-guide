import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RegenerationResult {
  message: string;
  regenerated_count: number;
  skipped_count: number;
  total_processed: number;
}

export const useSolutionRegeneration = () => {
  const [loading, setLoading] = useState(false);

  const regenerateSolutions = async (patientId: string, forceRegenerate = false): Promise<RegenerationResult | null> => {
    if (loading) {
      toast.error('Regeneration already in progress');
      return null;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-solution-confidence', {
        body: {
          patient_id: patientId,
          force_regenerate: forceRegenerate
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to regenerate solutions');
      }

      const result = data as RegenerationResult;
      
      if (result.regenerated_count > 0) {
        toast.success(
          `Successfully updated ${result.regenerated_count} solutions with realistic confidence scores`
        );
      } else {
        toast.info('No solutions needed regeneration - confidence scores look good!');
      }

      return result;

    } catch (error) {
      console.error('Error regenerating solutions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate solutions');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    regenerateSolutions,
    loading
  };
};