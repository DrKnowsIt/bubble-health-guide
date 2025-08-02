import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface UploadProgressDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  uploadProgress: number;
  analysisProgress: number;
  currentStep: 'uploading' | 'analyzing' | 'complete' | 'error';
  error?: string;
  summary?: string;
  fileSize: number;
  isLargeFile?: boolean;
}

export const UploadProgressDialog: React.FC<UploadProgressDialogProps> = ({
  open,
  onClose,
  fileName,
  uploadProgress,
  analysisProgress,
  currentStep,
  error,
  summary,
  fileSize,
  isLargeFile
}) => {
  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'uploading':
        return uploadProgress;
      case 'analyzing':
        return 100; // Upload complete, show analysis progress separately
      case 'complete':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  const canClose = currentStep === 'complete' || currentStep === 'error';

  return (
    <Dialog open={open} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : currentStep === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {currentStep === 'uploading' && 'Uploading File'}
            {currentStep === 'analyzing' && 'Analyzing Content'}
            {currentStep === 'complete' && 'Upload Complete'}
            {currentStep === 'error' && 'Upload Failed'}
          </DialogTitle>
          <DialogDescription>
            {fileName} ({formatFileSize(fileSize)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File size warning */}
          {isLargeFile && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Large File Detected</p>
                <p className="text-amber-700">
                  This file is over 5MB. The AI will provide a best-effort analysis but may not capture all details.
                </p>
              </div>
            </div>
          )}

          {/* Upload progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Upload Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Analysis progress */}
          {(currentStep === 'analyzing' || currentStep === 'complete') && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Analysis</span>
                <span>{currentStep === 'complete' ? '100' : analysisProgress}%</span>
              </div>
              <Progress value={currentStep === 'complete' ? 100 : analysisProgress} className="h-2" />
            </div>
          )}

          {/* Current step description */}
          <div className="text-sm text-muted-foreground">
            {currentStep === 'uploading' && 'Uploading file to secure storage...'}
            {currentStep === 'analyzing' && 'AI is analyzing the file content...'}
            {currentStep === 'complete' && 'File uploaded and analyzed successfully!'}
            {currentStep === 'error' && 'An error occurred during the process.'}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Analysis summary */}
          {summary && currentStep === 'complete' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">AI Analysis Summary</h4>
              <p className="text-sm text-green-700">{summary}</p>
            </div>
          )}

          {/* Close button */}
          {canClose && (
            <div className="flex justify-end">
              <Button onClick={onClose} variant={currentStep === 'error' ? 'destructive' : 'default'}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};