import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

interface ProbableDiagnosesProps {
  diagnoses: Diagnosis[];
  patientName: string;
}

export const ProbableDiagnoses = ({ diagnoses = [], patientName }: ProbableDiagnosesProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!diagnoses || diagnoses.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No probable diagnoses yet. Continue chatting for AI analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-emerald-600 bg-emerald-100';
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Probable Diagnoses</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {diagnoses.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              AI analysis for {patientName} (sorted by confidence)
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {diagnoses.map((diagnosis, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">
                    {diagnosis.diagnosis}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={getConfidenceColor(diagnosis.confidence)}
                    >
                      {getConfidenceLevel(diagnosis.confidence)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {Math.round(diagnosis.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <Progress 
                  value={diagnosis.confidence * 100} 
                  className="h-2"
                />

                <p className="text-sm text-muted-foreground">
                  {diagnosis.reasoning}
                </p>

                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  Updated {new Date(diagnosis.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Important:</strong> These are AI-generated suggestions based on symptoms discussed. 
                  Always consult with healthcare professionals for proper diagnosis and treatment.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};