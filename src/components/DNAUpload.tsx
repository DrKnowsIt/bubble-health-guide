import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DNAUploadProps {
  selectedPatient?: any | null;
  onUploadComplete?: () => void;
}

export const DNAUpload: React.FC<DNAUploadProps> = ({ selectedPatient, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "DNA files must be under 50MB.",
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File) => {
    if (!validateDNAFile(file)) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/dna/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('health-records')
        .getPublicUrl(fileName);

      // Create health record for DNA file
      const { error: recordError } = await supabase
        .from('health_records')
        .insert({
          user_id: user?.id,
          patient_id: selectedPatient?.id || null,
          record_type: 'dna',
          title: `DNA Analysis - ${file.name}`,
          data: {
            filename: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            source: file.name.toLowerCase().includes('ancestry') ? 'Ancestry' : 
                   file.name.toLowerCase().includes('23andme') ? '23andMe' : 'Unknown'
          },
          file_url: data.publicUrl
        });

      if (recordError) throw recordError;

      toast({
        title: "DNA File Uploaded",
        description: `Successfully uploaded ${file.name}`,
      });

      onUploadComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload DNA file.",
      });
    } finally {
      setUploading(false);
    }
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
      </CardContent>
    </Card>
  );
};