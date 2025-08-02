import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ThumbsUp, ThumbsDown, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

interface ProbableDiagnosesProps {
  diagnoses: Diagnosis[];
  patientName: string;
  patientId: string;
}

interface DiagnosisFeedback {
  diagnosis: string;
  feedback: 'positive' | 'negative';
}

export const ProbableDiagnoses = ({ diagnoses, patientName, patientId }: ProbableDiagnosesProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userFeedback, setUserFeedback] = useState<Record<string, 'positive' | 'negative'>>({});

  useEffect(() => {
    if (user && patientId) {
      loadExistingFeedback();
    }
  }, [user, patientId, diagnoses]);

  const loadExistingFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnosis_feedback')
        .select('diagnosis, feedback')
        .eq('user_id', user?.id)
        .eq('patient_id', patientId);

      if (error) throw error;

      const feedbackMap: Record<string, 'positive' | 'negative'> = {};
      data?.forEach((item: DiagnosisFeedback) => {
        feedbackMap[item.diagnosis] = item.feedback;
      });
      setUserFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const handleFeedback = async (diagnosis: string, feedback: 'positive' | 'negative') => {
    if (!user || !patientId) return;

    try {
      const { error } = await supabase
        .from('diagnosis_feedback')
        .upsert({
          user_id: user.id,
          patient_id: patientId,
          diagnosis,
          feedback,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setUserFeedback(prev => ({
        ...prev,
        [diagnosis]: feedback
      }));

    } catch (error) {
      console.error('Error saving diagnosis feedback:', error);
    }
  };

  if (!diagnoses || diagnoses.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No discussion topics yet. Continue chatting to prepare questions for your doctor.
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
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-3 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <CardTitle className="mobile-text-sm sm:text-lg truncate">Topics to Discuss with Your Doctor</CardTitle>
                <Badge variant="secondary" className="mobile-text-xs flex-shrink-0">
                  {diagnoses.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                {isOpen ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mobile-text-xs sm:text-sm text-muted-foreground text-left truncate">
              Preparation topics for {patientName}'s doctor visit
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 p-3 sm:p-6">
            <div className="space-y-3">
              {diagnoses.map((diagnosis, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-foreground mobile-text-sm sm:text-base break-words leading-snug flex-1">
                      {diagnosis.diagnosis}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={`mobile-text-xs px-2 py-1 flex-shrink-0 ${getConfidenceColor(diagnosis.confidence)}`}
                    >
                      {getConfidenceLevel(diagnosis.confidence)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="mobile-text-xs text-muted-foreground flex-shrink-0">Confidence:</span>
                      <Progress value={diagnosis.confidence * 100} className="flex-1 h-1.5 sm:h-2" />
                      <span className="mobile-text-xs text-muted-foreground flex-shrink-0">
                        {Math.round(diagnosis.confidence * 100)}%
                      </span>
                    </div>
                    
                    <p className="mobile-text-sm text-muted-foreground break-words leading-relaxed">
                      {diagnosis.reasoning}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-1 mobile-text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(diagnosis.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleFeedback(diagnosis.diagnosis, 'positive')}
                          className={`h-7 w-7 p-0 ${
                            userFeedback[diagnosis.diagnosis] === 'positive' 
                              ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                              : 'text-muted-foreground hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleFeedback(diagnosis.diagnosis, 'negative')}
                          className={`h-7 w-7 p-0 ${
                            userFeedback[diagnosis.diagnosis] === 'negative' 
                              ? 'text-red-600 bg-red-100 hover:bg-red-200' 
                              : 'text-muted-foreground hover:text-red-600'
                          }`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="mobile-text-xs text-muted-foreground">
                     <strong>Important:</strong> These are AI-generated possibilities to help you prepare questions for your doctor. 
                     Only healthcare professionals can provide proper diagnosis and treatment.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};