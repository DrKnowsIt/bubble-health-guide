import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, AlertCircle, Calendar, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

interface ProbableDiagnosesProps {
  diagnoses: Diagnosis[];
  patientName: string;
  patientId?: string;
}

interface DiagnosisFeedback {
  diagnosis_text: string;
  feedback_type: 'up' | 'down';
}

export const ProbableDiagnoses = ({ diagnoses = [], patientName, patientId }: ProbableDiagnosesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const { user } = useAuth();

  // Load existing feedback on component mount
  useEffect(() => {
    if (user?.id && patientId && diagnoses.length > 0) {
      loadExistingFeedback();
    }
  }, [user?.id, patientId, diagnoses]);

  const loadExistingFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnosis_feedback')
        .select('diagnosis_text, feedback_type')
        .eq('user_id', user?.id)
        .eq('patient_id', patientId);

      if (error) throw error;

      const feedbackMap: Record<string, 'up' | 'down'> = {};
      data?.forEach((item: DiagnosisFeedback) => {
        feedbackMap[item.diagnosis_text] = item.feedback_type;
      });
      setFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading diagnosis feedback:', error);
    }
  };

  const handleFeedback = async (diagnosisText: string, feedbackType: 'up' | 'down') => {
    if (!user?.id || !patientId) return;

    try {
      // Check if feedback already exists
      const { data: existing } = await supabase
        .from('diagnosis_feedback')
        .select('id')
        .eq('user_id', user.id)
        .eq('patient_id', patientId)
        .eq('diagnosis_text', diagnosisText)
        .single();

      if (existing) {
        // Update existing feedback
        const { error } = await supabase
          .from('diagnosis_feedback')
          .update({ feedback_type: feedbackType })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new feedback
        const { error } = await supabase
          .from('diagnosis_feedback')
          .insert({
            user_id: user.id,
            patient_id: patientId,
            diagnosis_text: diagnosisText,
            feedback_type: feedbackType
          });

        if (error) throw error;
      }

      // Update local state
      setFeedback(prev => ({
        ...prev,
        [diagnosisText]: feedbackType
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
              AI analysis for {patientName}
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
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-2 py-1 ${getConfidenceColor(diagnosis.confidence)}`}
                  >
                    {getConfidenceLevel(diagnosis.confidence)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Confidence:</span>
                    <Progress value={diagnosis.confidence * 100} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(diagnosis.confidence * 100)}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {diagnosis.reasoning}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(diagnosis.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Thumb up/down buttons */}
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(diagnosis.diagnosis, 'up')}
                        className={`h-8 w-8 p-0 ${
                          feedback[diagnosis.diagnosis] === 'up' 
                            ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                            : 'text-muted-foreground hover:text-green-600'
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(diagnosis.diagnosis, 'down')}
                        className={`h-8 w-8 p-0 ${
                          feedback[diagnosis.diagnosis] === 'down' 
                            ? 'text-red-600 bg-red-100 hover:bg-red-200' 
                            : 'text-muted-foreground hover:text-red-600'
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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