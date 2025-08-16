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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Health Records
                  {selectedPatient && (
                    <span className="text-sm font-normal text-muted-foreground">
                      - {selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedPatient 
                    ? `Manage ${selectedPatient.first_name}'s medical history and health information.`
                    : "Select a patient to manage their medical history and health information."
                  }
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                        disabled={!selectedPatient && users.length > 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPatient && users.length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 text-sm">
                  ⚠️ Please select a patient from the dropdown above to view and manage their health records.
                </p>
              </div>
            )}
            
            {showCreateForm && selectedPatient && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Health Record for {selectedPatient.first_name} {selectedPatient.last_name}</CardTitle>
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Important Legal Notice</p>
                      <p className="text-amber-700 mt-1">
                        This health record system is for informational purposes only. File uploads are disabled for legal compliance. 
                        Please consult with healthcare professionals for medical advice.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createRecord} className="space-y-4">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="patient_id">Assign to Patient</Label>
                      <Select
                        value={formData.patient_id}
                        onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select a patient" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border z-50">
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No specific patient (general record)</span>
                          </SelectItem>
                          {users.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              <div className="flex items-center gap-2">
                                <span>{patient.first_name} {patient.last_name}</span>
                                {patient.is_primary && <span className="text-xs text-muted-foreground">(Primary)</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose which patient this health record belongs to, or leave blank for general records.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="record_type">Record Type</Label>
                        <Select
                          value={formData.record_type}
                          onValueChange={(value) => setFormData({ ...formData, record_type: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select record type" />
                          </SelectTrigger>
                          <SelectContent>
                            {recordTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Enter record title"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data">Health Information (Text Only)</Label>
                      <Textarea
                        id="data"
                        value={formData.data}
                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        placeholder="Enter health information as text. File uploads are not available."
                        rows={4}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        For legal compliance, only text-based health records are supported. 
                        File uploads have been disabled.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Record'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}


            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading health records...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {records.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Health Records</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first health record to build your medical profile.
                  </p>
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    disabled={!selectedPatient && users.length > 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Record
                  </Button>
                </div>
              ) : (
                records.map((record) => {
                  const typeInfo = getRecordTypeInfo(record.record_type);
                  return (
                    <Card key={record.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <typeInfo.icon className="h-5 w-5 text-primary mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{record.title}</h3>
                                <Badge variant="secondary">{typeInfo.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Created: {new Date(record.created_at).toLocaleDateString()}
                              </p>
                              {record.data && Object.keys(record.data).length > 0 && (
                                <div className="text-sm">
                                  <strong>Data:</strong>
                                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                    {JSON.stringify(record.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {record.file_url && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Download className="h-4 w-4" />
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.storage
                                          .from('health-records')
                                          .createSignedUrl(record.file_url, 3600);
                                        
                                        if (error || !data?.signedUrl) {
                                          toast({
                                            title: "Download failed",
                                            description: "Could not generate download link",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        
                                        // Open the signed URL in a new tab
                                        window.open(data.signedUrl, '_blank');
                                      } catch (err) {
                                        console.error('Download error:', err);
                                        toast({
                                          title: "Download failed",
                                          description: "An error occurred while downloading the file",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="text-sm text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    Download attached file
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRecord(record.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
              </div>
            )}
          </CardContent>
        </Card>
        
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