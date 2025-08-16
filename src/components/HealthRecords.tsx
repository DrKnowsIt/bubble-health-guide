import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { DNAUpload } from '@/components/DNAUpload';
import { UploadProgressDialog } from '@/components/UploadProgressDialog';
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  Heart,
  Activity,
  Dna,
  Utensils,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';

interface HealthRecord {
  id: string;
  record_type: string;
  title: string;
  data: any;
  file_url: string | null;
  created_at: string;
}

const recordTypes = [
  { value: 'family_history', label: 'Family History', icon: User },
  { value: 'blood_panel', label: 'Blood Panel', icon: Activity },
  { value: 'medical_history', label: 'Medical History', icon: Heart },
  { value: 'workout', label: 'Workout Routine', icon: Activity },
  { value: 'diet', label: 'Diet Plan', icon: Utensils },
  { value: 'dna_genetics', label: 'DNA Analysis', icon: Dna },
];

interface HealthRecordsProps {
  selectedPatient?: any | null;
}

export const HealthRecords = ({ selectedPatient: propSelectedPatient }: HealthRecordsProps) => {
  const { user } = useAuth();
  const { subscribed, subscription_tier } = useSubscription();
  const { users, selectedUser: hookSelectedPatient } = useUsers();
  
  // Use prop patient if provided, otherwise use hook patient
  const selectedPatient = propSelectedPatient !== undefined ? propSelectedPatient : hookSelectedPatient;
  const { toast } = useToast();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');
  const [progressError, setProgressError] = useState<string>('');
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const [formData, setFormData] = useState({
    record_type: '',
    title: '',
    data: '',
    patient_id: 'none'
  });

  // Update patient_id when selectedPatient changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      patient_id: selectedPatient?.id || 'none'
    }));
  }, [selectedPatient]);

  useEffect(() => {
    if (user) {
      loadRecords();
    }
  }, [user, selectedPatient]);

  const loadRecords = async (retryCount = 0) => {
    setLoading(true);
    try {
      let query = supabase
        .from('health_records')
        .select('*')
        .eq('user_id', user?.id);

      // Filter by selected patient if one is selected
      if (selectedPatient) {
        query = query.eq('patient_id', selectedPatient.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Failed to load health records:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message?.includes('network') || error.message?.includes('timeout'))) {
        console.log(`Retrying health records load... (attempt ${retryCount + 1})`);
        setTimeout(() => loadRecords(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Error Loading Records",
        description: "Failed to load health records. Please check your connection and try again.",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRecords()}
          >
            Retry
          </Button>
        ),
      });
    } finally {
      setLoading(false);
    }
  };


  const closeProgressDialog = () => {
    setShowProgressDialog(false);
    setCurrentStep('uploading');
    setUploadProgress(0);
    setAnalysisProgress(0);
    setProgressError('');
    setAnalysisSummary('');
  };

  const createRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let parsedData = {};
      if (formData.data) {
        try {
          parsedData = JSON.parse(formData.data);
        } catch {
          parsedData = { content: formData.data };
        }
      }

      const { error } = await supabase
        .from('health_records')
        .insert({
          user_id: user?.id,
          patient_id: formData.patient_id === 'none' ? null : formData.patient_id || null,
          record_type: formData.record_type,
          title: formData.title,
          data: parsedData,
          file_url: null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Health record created successfully.",
      });

      setFormData({
        record_type: '',
        title: '',
        data: '',
        patient_id: 'none'
      });
      setShowCreateForm(false);
      loadRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create record.",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Health record deleted successfully.",
      });

      loadRecords();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete record.",
      });
    }
  };

  const getRecordTypeInfo = (type: string) => {
    return recordTypes.find(rt => rt.value === type) || recordTypes[0];
  };

  return (
    <SubscriptionGate 
      requiredTier="basic" 
      feature="Health Records"
      description="Manage your health records and documents. Available on Basic and Pro plans."
    >
      <div className="space-y-6">
        
        {/* DNA Upload Section */}
        <SubscriptionGate requiredTier="pro" feature="DNA/Genetics Analysis" description="Upload DNA data for advanced analysis — available on Pro.">
          <DNAUpload 
            selectedPatient={selectedPatient} 
            onUploadComplete={loadRecords}
          />
        </SubscriptionGate>
      </div>
    </SubscriptionGate>
  );
};