import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Clock, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useConversationSolutions } from '@/hooks/useConversationSolutions';

interface Diagnosis {
  id?: string;
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
  created_at?: string;
}

interface DiagnosisGroup {
  primary: Diagnosis;
  related: Diagnosis[];
  category: 'high_confidence' | 'moderate_confidence' | 'low_confidence';
}

interface DiagnosisFeedback {
  diagnosis_text: string;
  feedback_type: 'positive' | 'negative';
}

interface EnhancedHealthInsightsPanelProps {
  diagnoses: Diagnosis[];
  patientName: string;
  patientId: string;
  conversationId?: string;
}

const EnhancedHealthInsightsPanel: React.FC<EnhancedHealthInsightsPanelProps> = ({
  diagnoses, 
  patientName, 
  patientId,
  conversationId
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [groupedDiagnoses, setGroupedDiagnoses] = useState<DiagnosisGroup[]>([]);
  
  // Use solutions hook
  const { 
    solutions, 
    loading: solutionsLoading, 
    feedback: solutionsFeedback, 
    handleFeedback: handleSolutionFeedback 
  } = useConversationSolutions(conversationId, patientId);

  useEffect(() => {
    if (diagnoses && diagnoses.length > 0) {
      groupDiagnoses(diagnoses);
    }
  }, [diagnoses]);

  useEffect(() => {
    if (user && patientId) {
      loadExistingFeedback();
    }
  }, [user, patientId, diagnoses]);

  const groupDiagnoses = (diagnosisList: Diagnosis[]) => {
    const sorted = [...diagnosisList].sort((a, b) => b.confidence - a.confidence);
    const groups: DiagnosisGroup[] = [];
    
    // Group by confidence levels and similarity
    const highConfidence = sorted.filter(d => d.confidence >= 0.7);
    const moderateConfidence = sorted.filter(d => d.confidence >= 0.5 && d.confidence < 0.7);
    const lowConfidence = sorted.filter(d => d.confidence < 0.5);
    
    // Create groups for high confidence (these are established topics)
    highConfidence.forEach(diagnosis => {
      groups.push({
        primary: diagnosis,
        related: [],
        category: 'high_confidence'
      });
    });
    
    // Create groups for moderate confidence
    moderateConfidence.forEach(diagnosis => {
      groups.push({
        primary: diagnosis,
        related: [],
        category: 'moderate_confidence'
      });
    });
    
    // Create groups for low confidence
    lowConfidence.forEach(diagnosis => {
      groups.push({
        primary: diagnosis,
        related: [],
        category: 'low_confidence'
      });
    });
    
    setGroupedDiagnoses(groups);
  };

  const loadExistingFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnosis_feedback')
        .select('diagnosis_text, feedback_type')
        .eq('user_id', user?.id)
        .eq('patient_id', patientId);

      if (error) throw error;

      const feedbackMap: Record<string, string> = {};
      data?.forEach((item: DiagnosisFeedback) => {
        feedbackMap[item.diagnosis_text] = item.feedback_type;
      });
      setFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const handleFeedback = async (diagnosis: string, feedbackType: 'positive' | 'negative') => {
    if (!user || !patientId) return;

    try {
      const { error } = await supabase
        .from('diagnosis_feedback')
        .upsert({
          user_id: user.id,
          patient_id: patientId,
          diagnosis_text: diagnosis,
          feedback_type: feedbackType,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setFeedback(prev => ({
        ...prev,
        [diagnosis]: feedbackType
      }));

    } catch (error) {
      console.error('Error saving diagnosis feedback:', error);
    }
  };

  const isEmpty = !diagnoses || diagnoses.length === 0;
  const solutionsEmpty = !solutions || solutions.length === 0;

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return "bg-red-500";
    if (confidence >= 0.5) return "bg-orange-500";
    if (confidence >= 0.3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 0.7) return "High Confidence";
    if (confidence >= 0.5) return "Moderate";
    if (confidence >= 0.3) return "Low";
    return "Very Low";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'high_confidence': return '🎯';
      case 'moderate_confidence': return '🔍';
      case 'low_confidence': return '💭';
      default: return '💡';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'high_confidence':
        return 'bg-green-900/20 text-green-400 border-green-700';
      case 'moderate_confidence':
        return 'bg-teal-900/20 text-teal-400 border-teal-700';
      case 'low_confidence':
        return 'bg-teal-900/20 text-teal-400 border-teal-700';
      default:
        return 'bg-teal-900/20 text-teal-400 border-teal-700';
    }
  };

  const getSolutionCategoryIcon = (category: string) => {
    switch (category) {
      case 'lifestyle': return '🏃‍♂️';
      case 'stress': return '🧘‍♀️';
      case 'sleep': return '😴';
      case 'nutrition': return '🥗';
      case 'exercise': return '💪';
      case 'mental_health': return '🧠';
      default: return '💡';
    }
  };

  const getSolutionCategoryColor = (category: string) => {
    switch (category) {
      case 'lifestyle': return 'bg-blue-100 text-blue-800';
      case 'stress': return 'bg-purple-100 text-purple-800';
      case 'sleep': return 'bg-indigo-100 text-indigo-800';
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'exercise': return 'bg-orange-100 text-orange-800';
      case 'mental_health': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Health Insights for {patientName}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <Tabs defaultValue="topics" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                <TabsTrigger value="topics" className="flex-col items-center gap-1 py-3 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span className="hidden sm:inline">Health Topics</span>
                    <span className="sm:hidden">Topics</span>
                  </div>
                  {!isEmpty && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-[1rem]">
                      {diagnoses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="solutions" className="flex-col items-center gap-1 py-3 px-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span className="hidden sm:inline">Holistic Solutions</span>
                    <span className="sm:hidden">Solutions</span>
                  </div>
                  {!solutionsEmpty && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-[1rem]">
                      {solutions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="mt-6">
                {isEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No potential health topics identified yet.</p>
                    <p className="text-sm mt-1">
                      Continue your conversation for personalized insights.
                    </p>
                  </div>
                ) : (
                  <>
                     <div className="space-y-4">
                        {groupedDiagnoses.map((group, groupIndex) => (
                          <div key={groupIndex} className={`border rounded-lg overflow-hidden ${getCategoryColor(group.category)}`}>
                            <div className="p-4">
                              <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0">
                                    <span className="text-2xl">{getCategoryIcon(group.category)}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-1">
                                      <h3 className="font-semibold text-base leading-tight text-foreground overflow-hidden text-ellipsis">
                                        {group.primary.diagnosis.replace(/\b(possible|potential|suspected|likely)\s+/gi, '').trim()}
                                      </h3>
                                      <Badge className={`text-xs self-start sm:self-center flex-shrink-0 ${getCategoryColor(group.category)}`}>
                                        {getConfidenceLevel(group.primary.confidence)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 md:text-right">
                                  <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2">
                                    <div className="text-sm font-medium">
                                      {Math.round(group.primary.confidence * 100)}%
                                    </div>
                                    {group.primary.updated_at && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3 flex-shrink-0" />
                                        <span className="whitespace-nowrap">{formatDate(group.primary.updated_at)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            
                            {group.primary.reasoning && (
                              <div className="mb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {group.primary.reasoning}
                                </p>
                              </div>
                            )}

                            {/* Related diagnoses if any */}
                            {group.related.length > 0 && (
                              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                                <h4 className="text-xs font-medium text-muted-foreground mb-2">Related Topics:</h4>
                                <div className="space-y-2">
                                  {group.related.map((related, idx) => (
                                    <div key={idx} className="text-sm">
                                      <span className="font-medium">{related.diagnosis}</span>
                                      <span className="text-muted-foreground"> ({Math.round(related.confidence * 100)}%)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-3 border-t">
                              <span className="text-xs text-muted-foreground">
                                Was this topic helpful?
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant={feedback[group.primary.diagnosis] === 'positive' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleFeedback(group.primary.diagnosis, 'positive')}
                                  className="h-7 px-2"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant={feedback[group.primary.diagnosis] === 'negative' ? 'destructive' : 'outline'}
                                  size="sm"
                                  onClick={() => handleFeedback(group.primary.diagnosis, 'negative')}
                                  className="h-7 px-2"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        These are AI-generated discussion topics based on your conversation. High-confidence topics 
                        are preserved across conversations. Always consult with a qualified healthcare professional 
                        for proper medical advice and diagnosis.
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="solutions" className="mt-6">
                {solutionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p>Analyzing conversation for holistic solutions...</p>
                  </div>
                ) : solutionsEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No holistic solutions identified yet.</p>
                    <p className="text-sm mt-1">
                      Continue your conversation to receive personalized wellness suggestions.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Comprehensive Wellness Approach</h4>
                      <p className="text-xs text-blue-700">
                        These solutions are designed to address all health topics you've discussed, 
                        providing a holistic approach to wellness and symptom management.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {solutions.map((solution, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getSolutionCategoryIcon(solution.category)}</span>
                              <Badge className={`text-xs ${getSolutionCategoryColor(solution.category)}`}>
                                {solution.category.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="text-sm font-medium mb-1">
                                {getConfidenceLevel(solution.confidence)}
                              </div>
                              <Progress 
                                value={solution.confidence * 100} 
                                className="w-24 h-2"
                              />
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-base leading-tight mb-2">
                            {solution.solution}
                          </h3>
                          
                          {solution.reasoning && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {solution.reasoning}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">
                              Was this solution helpful?
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant={solutionsFeedback[solution.solution] === 'helpful' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleSolutionFeedback(solution.solution, 'helpful')}
                                className="h-7 px-2"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant={solutionsFeedback[solution.solution] === 'not_helpful' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => handleSolutionFeedback(solution.solution, 'not_helpful')}
                                className="h-7 px-2"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        <Target className="h-3 w-3 inline mr-1" />
                        These are holistic wellness suggestions that consider all your health topics. 
                        They are not medical advice. Always consult healthcare professionals for medical concerns.
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default EnhancedHealthInsightsPanel;