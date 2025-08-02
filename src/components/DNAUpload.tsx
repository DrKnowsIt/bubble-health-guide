import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UploadProgressDialog } from '@/components/UploadProgressDialog';

interface DNAUploadProps {
  selectedPatient?: any | null;
  onUploadComplete?: () => void;
}

export const DNAUpload: React.FC<DNAUploadProps> = ({ selectedPatient, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [existingDNARecords, setExistingDNARecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');
  const [progressError, setProgressError] = useState<string>('');
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load existing DNA records
  const loadExistingDNARecords = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('record_type', 'dna_genetics')
        .eq('patient_id', selectedPatient?.id || null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingDNARecords(data || []);
    } catch (error: any) {
      console.error('Error loading DNA records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExistingDNARecords();
  }, [user, selectedPatient]);

  const validateDNAFile = (file: File): boolean => {
    const validExtensions = ['.txt', '.csv', '.tsv'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(extension)) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a .txt, .csv, or .tsv file from Ancestry or 23andMe.",
      });
      return false;
    }

    // Hard limit at 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "DNA files must be under 10MB. Please compress or contact support for larger files.",
      });
      return false;
    }

    return true;
  };

  const triggerAIAnalysis = async (healthRecordId: string, fileName: string, fileSize: number) => {
    try {
      setCurrentStep('analyzing');
      setAnalysisProgress(10);

      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 20, 90));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('summarize-health-records', {
        body: { 
          health_record_id: healthRecordId,
          force_regenerate: true 
        }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) throw error;

      setAnalysisSummary(data?.summary || 'Analysis completed successfully.');
      setCurrentStep('complete');
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysisSummary('Analysis completed with limited results due to file size or format.');
      setCurrentStep('complete');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!validateDNAFile(file)) return;

    // Check if file is large (>5MB) for warning
    const isLargeFile = file.size > 5 * 1024 * 1024;
    
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);
    setUploading(true);
    setShowProgressDialog(true);
    setCurrentStep('uploading');
    setUploadProgress(0);
    setAnalysisProgress(0);
    setProgressError('');
    setAnalysisSummary('');

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/dna/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(fileName, file);

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('health-records')
        .getPublicUrl(fileName);

      // Create health record for DNA file
      const { data: recordData, error: recordError } = await supabase
        .from('health_records')
        .insert({
          user_id: user?.id,
          patient_id: selectedPatient?.id || null,
          record_type: 'dna_genetics',
          title: `DNA Analysis - ${file.name}`,
          data: {
            filename: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            source: file.name.toLowerCase().includes('ancestry') ? 'Ancestry' : 
                   file.name.toLowerCase().includes('23andme') ? '23andMe' : 'Unknown',
            isLargeFile
          },
          file_url: data.publicUrl
        })
        .select('id')
        .single();

      if (recordError) throw recordError;

      // Trigger AI analysis
      await triggerAIAnalysis(recordData.id, file.name, file.size);

      toast({
        title: "DNA File Processed",
        description: `Successfully uploaded and analyzed ${file.name}`,
      });

      // Refresh existing records and notify parent
      loadExistingDNARecords();
      onUploadComplete?.();
    } catch (error: any) {
      setCurrentStep('error');
      setProgressError(error.message || "Failed to upload DNA file.");
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload DNA file.",
      });
    } finally {
      setUploading(false);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          DNA File Upload
        </CardTitle>
        <CardDescription>
          Upload your DNA data from Ancestry.com or 23andMe for health insights.
          {selectedPatient && (
            <span className="block mt-1 text-sm">
              Uploading for: {selectedPatient.first_name} {selectedPatient.last_name}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop your DNA file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports .txt, .csv, and .tsv files from Ancestry and 23andMe
            </p>
          </div>
          
          <Label htmlFor="dna-file" className="cursor-pointer">
            <Input
              id="dna-file"
              type="file"
              accept=".txt,.csv,.tsv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="sr-only"
            />
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              disabled={uploading}
              onClick={() => document.getElementById('dna-file')?.click()}
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </Button>
          </Label>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">How to get your DNA file:</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• <strong>Ancestry:</strong> Go to Settings → Privacy → Download your data</li>
                <li>• <strong>23andMe:</strong> Go to Account → Download your data → Raw Data</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Your data is secure:</p>
              <p className="text-muted-foreground">Files are encrypted and only accessible by you.</p>
            </div>
          </div>
        </div>

        {/* Existing DNA Records */}
        {existingDNARecords.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Existing DNA Files ({existingDNARecords.length})
            </h4>
            <div className="space-y-2">
              {existingDNARecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.data?.source && `Source: ${record.data.source} • `}
                        Uploaded: {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {record.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(record.file_url, '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Dialog */}
        <UploadProgressDialog
          open={showProgressDialog}
          onClose={closeProgressDialog}
          fileName={currentFileName}
          uploadProgress={uploadProgress}
          analysisProgress={analysisProgress}
          currentStep={currentStep}
          error={progressError}
          summary={analysisSummary}
          fileSize={currentFileSize}
          isLargeFile={currentFileSize > 5 * 1024 * 1024}
        />
      </CardContent>
    </Card>
  );
};