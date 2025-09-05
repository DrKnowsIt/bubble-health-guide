import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ExportProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const analysisSteps = [
  "Analyzing patient data...",
  "Checking symptoms...",
  "Studying patterns...",
  "Reviewing diagnoses...",
  "Calculating confidence scores...",
  "Evaluating treatment options...",
  "Cross-referencing medical records...",
  "Identifying health trends...",
  "Generating test recommendations...",
  "Performing holistic assessment...",
  "Finalizing medical insights...",
  "Compiling comprehensive report..."
];

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  open,
  onOpenChange
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 8 + 2, 95);
        return newProgress;
      });
    }, 800);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % analysisSteps.length);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="relative mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Generating Medical Report
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {analysisSteps[currentStep]}
          </p>
          
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% Complete</span>
              <span>Please wait...</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4 text-center">
            This may take up to 30 seconds to analyze all your health data
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};