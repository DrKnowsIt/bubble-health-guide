import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface HealthAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  region: string;
  country: string;
  disease_type: string;
  recommendations: string[];
  source: string;
  published_at: string;
  expires_at?: string;
}

interface PatientLocation {
  location_region?: string | null;
  location_country?: string | null;
  recent_travel_locations?: string[] | null;
}

export const useLocationHealthAlerts = (patientId?: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Fetch patient location data
  const { data: patientLocation, isLoading: locationLoading } = useQuery({
    queryKey: ['patient-location', patientId],
    queryFn: async (): Promise<PatientLocation | null> => {
      if (!patientId || !user) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('location_region, location_country, recent_travel_locations')
        .eq('id', patientId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching patient location:', error);
        return null;
      }

      return data as PatientLocation;
    },
    enabled: !!patientId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch health alerts based on location
  const { 
    data: alertsData, 
    isLoading: alertsLoading, 
    refetch: refetchAlerts 
  } = useQuery({
    queryKey: ['health-alerts', patientId, patientLocation?.location_country],
    queryFn: async () => {
      if (!user) return { alerts: [] };

      const { data, error } = await supabase.functions.invoke('fetch-health-alerts', {
        body: {
          region: patientLocation?.location_region,
          country: patientLocation?.location_country,
          include_travel_locations: true,
          patient_id: patientId
        }
      });

      if (error) {
        console.error('Error fetching health alerts:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user && !!patientId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });

  // Update patient location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ 
      region, 
      country 
    }: { 
      region?: string; 
      country?: string;
    }) => {
      if (!patientId || !user) throw new Error('Missing patient or user');

      // Use type assertion for new columns not yet in generated types
      const { error } = await supabase
        .from('patients')
        .update({
          location_region: region,
          location_country: country,
          location_updated_at: new Date().toISOString()
        } as any)
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-location', patientId] });
      queryClient.invalidateQueries({ queryKey: ['health-alerts', patientId] });
      toast({
        title: 'Location Updated',
        description: 'Your location has been updated. Health alerts will reflect your new location.',
      });
    },
    onError: (error) => {
      console.error('Error updating location:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update location. Please try again.',
      });
    }
  });

  // Add travel location mutation
  const addTravelLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      if (!patientId || !user) throw new Error('Missing patient or user');

      const currentLocations = patientLocation?.recent_travel_locations || [];
      const updatedLocations = [...new Set([...currentLocations, location])].slice(-10); // Keep last 10

      // Use type assertion for new columns not yet in generated types
      const { error } = await supabase
        .from('patients')
        .update({
          recent_travel_locations: updatedLocations
        } as any)
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-location', patientId] });
      queryClient.invalidateQueries({ queryKey: ['health-alerts', patientId] });
      toast({
        title: 'Travel Location Added',
        description: 'Health alerts will include advisories for your travel destination.',
      });
    },
    onError: (error) => {
      console.error('Error adding travel location:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add travel location.',
      });
    }
  });

  // Remove travel location mutation
  const removeTravelLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      if (!patientId || !user) throw new Error('Missing patient or user');

      const currentLocations = patientLocation?.recent_travel_locations || [];
      const updatedLocations = currentLocations.filter(l => l !== location);

      // Use type assertion for new columns not yet in generated types
      const { error } = await supabase
        .from('patients')
        .update({
          recent_travel_locations: updatedLocations
        } as any)
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-location', patientId] });
      queryClient.invalidateQueries({ queryKey: ['health-alerts', patientId] });
    }
  });

  // Dismiss alert locally
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  }, []);

  // Get filtered alerts (excluding dismissed)
  const alerts = (alertsData?.alerts || []).filter(
    (alert: HealthAlert) => !dismissedAlerts.has(alert.id)
  );

  // Get alerts by severity
  const getAlertsBySeverity = useCallback(() => {
    const critical = alerts.filter((a: HealthAlert) => a.severity === 'critical');
    const high = alerts.filter((a: HealthAlert) => a.severity === 'high');
    const medium = alerts.filter((a: HealthAlert) => a.severity === 'medium');
    const low = alerts.filter((a: HealthAlert) => a.severity === 'low');
    return { critical, high, medium, low };
  }, [alerts]);

  return {
    alerts,
    loading: locationLoading || alertsLoading,
    patientLocation,
    travelLocations: patientLocation?.recent_travel_locations || [],
    updateLocation: updateLocationMutation.mutate,
    addTravelLocation: addTravelLocationMutation.mutate,
    removeTravelLocation: removeTravelLocationMutation.mutate,
    dismissAlert,
    refetchAlerts,
    getAlertsBySeverity,
    isUpdatingLocation: updateLocationMutation.isPending,
    cached: alertsData?.cached || false,
  };
};
