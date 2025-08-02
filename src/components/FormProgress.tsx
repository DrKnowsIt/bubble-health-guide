import { CheckCircle, Circle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  completedFields: number;
  totalFields: number;
  formTitle: string;
}

export const FormProgress = ({ 
  currentStep, 
  totalSteps, 
  completedFields, 
  totalFields, 
  formTitle 
}: FormProgressProps) => {
  const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{formTitle}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedFields} of {totalFields} fields completed</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{completedFields} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <span>{totalFields - completedFields} remaining</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};