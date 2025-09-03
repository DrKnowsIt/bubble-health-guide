import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useConversationSolutions } from '@/hooks/useConversationSolutions';
import { useHealthTopics } from '@/hooks/useHealthTopics';

interface Diagnosis {
  diagnosis: string;
  confidence: number;
  reasoning: string;
  updated_at: string;
}

interface DiagnosisFeedback {
  diagnosis_text: string;
  feedback_type: 'positive' | 'negative';
}

interface HealthInsightsPanelProps {
  diagnoses: Diagnosis[];
  patientName: string;
  patientId: string;
  conversationId?: string;
  messages?: Array<{ type: 'user' | 'ai'; content: string }>;
}

const HealthInsightsPanel: React.FC<HealthInsightsPanelProps> = ({
  diagnoses, 
  patientName, 
  patientId,
  conversationId,
  messages = []
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  
  // Use solutions hook
  const { 
    solutions, 
    loading: solutionsLoading, 
    feedback: solutionsFeedback, 
    handleFeedback: handleSolutionFeedback 
  } = useConversationSolutions(conversationId, patientId);

  // Use health topics hook for conversational topics
  const {
    topics: healthTopics,
    loading: topicsLoading,
    getConfidenceColor: getTopicConfidenceColor,
    getCategoryIcon: getTopicCategoryIcon
  } = useHealthTopics({
    conversationId,
    patientId,
    messages,
    minMessages: 2
  });

  // Debug logging to track conversation ID mismatch
  useEffect(() => {
    console.log('[HealthInsightsPanel] Debug - conversationId:', conversationId);
    console.log('[HealthInsightsPanel] Debug - solutions count:', solutions.length);
    console.log('[HealthInsightsPanel] Debug - solutions:', solutions);
  }, [conversationId, solutions]);

  useEffect(() => {
    if (user && patientId) {
      loadExistingFeedback();
    }
  }, [user, patientId]); // Removed diagnoses dependency to prevent constant updates

  // Real-time subscription for diagnosis updates
  useEffect(() => {
    if (!conversationId || !patientId) return;

    console.log('[HealthInsightsPanel] Setting up real-time subscription for conversation:', conversationId);

    // Set up real-time subscription for diagnoses
    const diagnosisChannel = supabase
      .channel('diagnosis-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_diagnoses',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[HealthInsightsPanel] Real-time diagnosis update:', payload);
          // The parent component should handle reloading diagnoses
          // This component receives diagnoses as props, so we just need to notify
          // For now, we don't need to do anything here as the parent handles the real-time updates
        }
      )
      .subscribe();

    return () => {
      console.log('[HealthInsightsPanel] Cleaning up real-time subscription');
      supabase.removeChannel(diagnosisChannel);
    };
  }, [conversationId, patientId]);

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
  const topicsEmpty = !healthTopics || healthTopics.length === 0;
  const showTopics = !isEmpty || !topicsEmpty;

  // Debug logging to help identify the conversation ID mismatch
  console.log('[HealthInsightsPanel] Current state:', {
    conversationId,
    patientId,
    solutionsCount: solutions.length,
    solutionsEmpty,
    solutionsLoading,
    isEmpty,
    diagnosesCount: diagnoses.length
  });

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "bg-red-500";
    if (confidence >= 0.6) return "bg-orange-500";
    if (confidence >= 0.4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 0.8) return "Very High";
    if (confidence >= 0.6) return "High";
    if (confidence >= 0.4) return "Moderate";
    return "Low";
  };

  const getCategoryIcon = (category: string) => {
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

  const getCategoryColor = (category: string) => {
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
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="topics" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm whitespace-nowrap min-w-0">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Medical</span>
                  {!isEmpty && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-0 flex-shrink-0">
                      {diagnoses.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="discussion" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm whitespace-nowrap min-w-0">
                  <MessageCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Discussion</span>
                  {!topicsEmpty && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-0 flex-shrink-0">
                      {healthTopics.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="solutions" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm whitespace-nowrap min-w-0">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Solutions</span>
                  {!solutionsEmpty && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-0 flex-shrink-0">
                      {solutions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="mt-6">
                {isEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No formal medical diagnoses identified yet.</p>
                    <p className="text-sm mt-1">
                      Medical topics require more detailed symptom discussions.
                    </p>
                  </div>
                ) : (
                  <>
                     <div className="space-y-4">
                       {diagnoses.map((diagnosis, index) => (
                          <div key={index} className={`p-4 rounded-lg border-2 ${diagnosis.confidence >= 0.6 ? 'bg-green-900/20 border-green-700' : 'bg-teal-900/20 border-teal-700'}`}>
                            {diagnosis.confidence >= 0.6 ? (
                              <Badge className="text-xs bg-green-800/30 text-green-400 border-green-700 whitespace-nowrap mb-3 inline-block">
                                High Confidence
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-teal-800/30 text-teal-400 border-teal-700 whitespace-nowrap mb-3 inline-block">
                                {diagnosis.confidence >= 0.4 ? 'Moderate Confidence' : 'Low Confidence'}
                              </Badge>
                            )}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0 mr-3">
                                <h3 className="font-semibold text-base leading-tight">
                                  {diagnosis.diagnosis}
                                </h3>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0 min-w-0">
                                <div className="text-sm font-medium mb-1">
                                  {Math.round(diagnosis.confidence * 100)}%
                                </div>
                                <div className="w-20">
                                  <Progress 
                                    value={diagnosis.confidence * 100} 
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </div>
                          
                          {diagnosis.reasoning && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {diagnosis.reasoning}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">
                              Was this helpful?
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant={feedback[diagnosis.diagnosis] === 'positive' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleFeedback(diagnosis.diagnosis, 'positive')}
                                className="h-7 px-2"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant={feedback[diagnosis.diagnosis] === 'negative' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => handleFeedback(diagnosis.diagnosis, 'negative')}
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
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        These are AI-generated suggestions based on your conversation. Always consult with 
                        a qualified healthcare professional for proper medical advice and diagnosis.
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="discussion" className="mt-6">
                {topicsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p>Analyzing conversation for health topics...</p>
                  </div>
                ) : topicsEmpty ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No discussion topics identified yet.</p>
                    <p className="text-sm mt-1">
                      Continue your conversation for topic analysis.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {healthTopics.map((topic, index) => (
                        <div key={index} className={`p-4 rounded-lg border-2 ${getTopicConfidenceColor(topic.confidence)}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 mr-4">
                              <span className="text-2xl">{getTopicCategoryIcon(topic.category)}</span>
                              <div>
                                <h3 className="font-semibold text-base leading-tight">
                                  {topic.topic}
                                </h3>
                                <Badge className={`mt-1 text-xs ${topic.category ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {topic.category || 'General'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium mb-1">
                                {Math.round(topic.confidence * 100)}%
                              </div>
                              <Progress 
                                value={topic.confidence * 100} 
                                className="w-20 h-3"
                              />
                            </div>
                          </div>
                         
                         {topic.reasoning && (
                           <div className="mb-4">
                             <p className="text-sm text-muted-foreground leading-relaxed">
                               {topic.reasoning}
                             </p>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                   
                   <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                     <p className="text-xs text-muted-foreground text-center leading-relaxed">
                       <MessageCircle className="h-3 w-3 inline mr-1" />
                       These are conversational health topics identified from your discussion. 
                       Always consult with a qualified healthcare professional for medical advice.
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
                    <div className="text-xs mt-2 bg-muted/30 rounded p-2">
                      💡 Solutions are generated after 4+ messages in this conversation
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {solutions.map((solution, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getCategoryIcon(solution.category)}</span>
                              <Badge className={`text-xs ${getCategoryColor(solution.category)}`}>
                                {solution.category.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="text-sm font-medium mb-1">
                                Confidence: {getConfidenceLevel(solution.confidence)}
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
                              Was this helpful?
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
                        These are holistic wellness suggestions based on your conversation. 
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

export default HealthInsightsPanel;