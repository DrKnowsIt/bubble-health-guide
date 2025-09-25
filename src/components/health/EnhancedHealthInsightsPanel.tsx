import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Layers } from 'lucide-react';
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
  showDemoTopics?: boolean;
}

const EnhancedHealthInsightsPanel: React.FC<EnhancedHealthInsightsPanelProps> = ({
  diagnoses, 
  patientName, 
  patientId,
  conversationId,
  showDemoTopics = false
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [groupedDiagnoses, setGroupedDiagnoses] = useState<DiagnosisGroup[]>([]);
  
  // Demo topics for non-authenticated users
  const demoTopics = [
    {
      condition: "Tension Headaches",
      probability: "High",
      description: "High probability based on stress pattern",
      confidence: 0.8
    },
    {
      condition: "Sleep Deprivation Effects", 
      probability: "High",
      description: "Likely contributing factor",
      confidence: 0.75
    },
    {
      condition: "Dehydration",
      probability: "Medium", 
      description: "Possible secondary cause",
      confidence: 0.6
    },
    {
      condition: "Stress Management",
      probability: "High",
      description: "Recommended focus area", 
      confidence: 0.8
    }
  ];

  // Demo solutions for non-authenticated users
  const demoSolutions = [
    {
      category: 'stress',
      confidence: 0.85,
      solution: 'Practice deep breathing exercises for 5-10 minutes when you feel tension building. Try the 4-7-8 technique: inhale for 4, hold for 7, exhale for 8.',
      reasoning: 'Deep breathing activates the parasympathetic nervous system, helping reduce stress-induced tension headaches.',
      implementation_difficulty: 'easy'
    },
    {
      category: 'sleep',
      confidence: 0.8,
      solution: 'Establish a consistent sleep schedule by going to bed and waking up at the same time daily. Create a relaxing bedtime routine 30 minutes before sleep.',
      reasoning: 'Regular sleep patterns improve sleep quality and reduce afternoon fatigue that can trigger headaches.',
      implementation_difficulty: 'moderate'
    },
    {
      category: 'lifestyle',
      confidence: 0.75,
      solution: 'Set hourly water reminders and aim for 8 glasses daily. Keep a water bottle visible on your desk as a visual cue.',
      reasoning: 'Proper hydration prevents dehydration headaches and supports overall brain function.',
      implementation_difficulty: 'easy'
    },
    {
      category: 'exercise',
      confidence: 0.7,
      solution: 'Try gentle neck and shoulder stretches every 2 hours, especially if you work at a desk. Focus on slow, controlled movements.',
      reasoning: 'Regular stretching relieves muscle tension in the neck and shoulders, common trigger points for tension headaches.',
      implementation_difficulty: 'easy'
    }
  ];
  
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

  // Load feedback only when user/patient changes, NOT on every diagnosis change
  useEffect(() => {
    if (user && patientId) {
      loadExistingFeedback();
    }
  }, [user, patientId]); // Removed diagnoses from dependencies to prevent query storm

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
                {showDemoTopics ? (
                  <>
                    <div className="space-y-4">
                      {demoTopics.map((topic, index) => (
                        <div key={index} className="border rounded-lg overflow-hidden bg-green-900/20 text-green-400 border-green-700">
                          <div className="p-4">
                            <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  <span className="text-2xl">🎯</span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-base leading-tight text-foreground">
                                    {topic.condition}
                                  </h3>
                                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    {topic.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 md:text-right">
                                <div className="flex md:flex-col items-center md:items-end gap-1">
                                  <div className="text-sm font-medium">
                                    {Math.round(topic.confidence * 100)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getConfidenceLevel(topic.confidence)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        This is a sample of what health topic analysis looks like. Sign up to get personalized insights based on your conversations.
                      </p>
                    </div>
                  </>
                ) : isEmpty ? (
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
                                     <h3 className="font-semibold text-base leading-tight text-foreground">
                                       {group.primary.diagnosis.replace(/\b(possible|potential|suspected|likely)\s+/gi, '').trim()}
                                     </h3>
                                   </div>
                                </div>
                                <div className="flex-shrink-0 md:text-right">
                                  <div className="flex md:flex-col items-center md:items-end gap-1">
                                    <div className="text-sm font-medium">
                                      {Math.round(group.primary.confidence * 100)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {getConfidenceLevel(group.primary.confidence)}
                                    </div>
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
                {showDemoTopics ? (
                  <>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Comprehensive Wellness Approach</h4>
                      <p className="text-xs text-blue-700">
                        These solutions address the headache topics from the conversation, providing a holistic approach to wellness.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {demoSolutions.map((solution, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-card">
                          <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <span className="text-lg">{getSolutionCategoryIcon(solution.category)}</span>
                              </div>
                              <div className="flex-1">
                                <Badge className={`text-xs ${getSolutionCategoryColor(solution.category)}`}>
                                  {solution.category.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex-shrink-0 md:text-right">
                              <div className="flex md:flex-col items-center md:items-end gap-1">
                                <div className="text-sm font-medium">
                                  {Math.round(solution.confidence * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getConfidenceLevel(solution.confidence)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <h3 className="font-semibold text-base leading-tight mb-2">
                            {solution.solution}
                          </h3>
                          
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {solution.reasoning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        <Target className="h-3 w-3 inline mr-1" />
                        This is a sample of personalized holistic solutions. Sign up to get customized wellness recommendations based on your conversations.
                      </p>
                    </div>
                  </>
                ) : solutionsLoading ? (
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
                          <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <span className="text-lg">{getSolutionCategoryIcon(solution.category)}</span>
                              </div>
                              <div className="flex-1">
                                <Badge className={`text-xs ${getSolutionCategoryColor(solution.category)}`}>
                                  {solution.category.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex-shrink-0 md:text-right">
                              <div className="flex md:flex-col items-center md:items-end gap-1">
                                <div className="text-sm font-medium">
                                  {Math.round(solution.confidence * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getConfidenceLevel(solution.confidence)}
                                </div>
                              </div>
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