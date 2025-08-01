import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

export interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  relationship: string;
  is_primary: boolean;
  probable_diagnoses?: Diagnosis[];
  created_at: string;
  updated_at: string;
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  relationship: string;
  is_primary?: boolean;
}

export const usePatients = () => {
  const { user } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch patients
  const fetchPatients = async () => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to match Patient interface
      const transformedData = (data || []).map(patient => ({
        ...patient,
        probable_diagnoses: Array.isArray(patient.probable_diagnoses) 
          ? patient.probable_diagnoses as unknown as Diagnosis[]
          : []
      }));

      setPatients(transformedData);
      
      // Auto-select primary patient or first patient
      if (transformedData.length > 0 && !selectedPatient) {
        const primaryPatient = transformedData.find(p => p.is_primary);
        setSelectedPatient(primaryPatient || transformedData[0]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get patient limit based on subscription
  const getPatientLimit = () => {
    if (!subscribed || !subscription_tier) return 0;
    if (subscription_tier === 'basic') return 2;
    if (subscription_tier === 'pro') return 10;
    return 0;
  };

  // Check if user can add more patients
  const canAddPatient = () => {
    const limit = getPatientLimit();
    return patients.length < limit;
  };

  // Create a new patient
  const createPatient = async (patientData: CreatePatientData) => {
    if (!user) throw new Error('User not authenticated');
    
    // Check patient limit
    if (!canAddPatient()) {
      const limit = getPatientLimit();
      if (limit === 0) {
        throw new Error('A subscription is required to add patients. Please upgrade to access this feature.');
      } else {
        throw new Error(`Patient limit reached. Your ${subscription_tier} plan allows up to ${limit} patients. Please upgrade to add more patients.`);
      }
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          ...patientData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform data to match Patient interface
      const transformedPatient = {
        ...data,
        probable_diagnoses: Array.isArray(data.probable_diagnoses) 
          ? data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      setPatients(prev => [...prev, transformedPatient]);
      
      // If this is the first patient or is_primary, select it
      if (patients.length === 0 || patientData.is_primary) {
        setSelectedPatient(transformedPatient);
      }

      return data;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  };

  // Update a patient
  const updatePatient = async (patientId: string, updates: Partial<CreatePatientData>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Transform data to match Patient interface
      const transformedPatient = {
        ...data,
        probable_diagnoses: Array.isArray(data.probable_diagnoses) 
          ? data.probable_diagnoses as unknown as Diagnosis[]
          : []
      };

      setPatients(prev => 
        prev.map(p => p.id === patientId ? transformedPatient : p)
      );

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(transformedPatient);
      }

      return data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  };

  // Delete a patient
  const deletePatient = async (patientId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPatients(prev => prev.filter(p => p.id !== patientId));
      
      if (selectedPatient?.id === patientId) {
        const remainingPatients = patients.filter(p => p.id !== patientId);
        setSelectedPatient(remainingPatients.length > 0 ? remainingPatients[0] : null);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user]);

  return {
    patients,
    selectedPatient,
    setSelectedPatient,
    loading,
    createPatient,
    updatePatient,
    deletePatient,
    refreshPatients: fetchPatients,
    canAddPatient,
    getPatientLimit
  };
};