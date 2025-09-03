import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Clock, Layers, RefreshCw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHealthTopics } from '@/hooks/useHealthTopics';

interface HealthTopicsPanelProps {
  conversationId?: string;
  patientId: string;
  patientName: string;
  conversationContext: string;
  conversationType?: 'easy_chat' | 'regular_chat';
  selectedAnatomy?: string[];
  includeSolutions?: boolean;
  mode?: 'free' | 'basic' | 'pro';
}

export const HealthTopicsPanel: React.FC<HealthTopicsPanelProps> = ({
  conversationId,
  patientId,
  patientName,
  conversationContext,
  conversationType = 'regular_chat',
  selectedAnatomy = [],
  includeSolutions = true,
  mode = 'basic'
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const {
    topics,
    solutions,
    loading,
    feedback,
    handleTopicFeedback,
    handleSolutionFeedback,
    refreshAnalysis,
    isEmpty,
    solutionsEmpty
  } = useHealthTopics({
    conversationId,
    patientId,
    conversationContext,
    conversationType,
    selectedAnatomy,
    includeSolutions,
    minContextLength: conversationType === 'easy_chat' ? 10 : 20
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50';
    if (confidence >= 0.4) return 'text-amber-400 bg-amber-950/30 border-amber-800/50';
    return 'text-red-400 bg-red-950/30 border-red-800/50';
  };

  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.4) return "Moderate";
    return "Low";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'musculoskeletal': return <Target className="h-4 w-4 text-blue-400" />;
      case 'dermatological': return <Layers className="h-4 w-4 text-emerald-400" />;
      case 'gastrointestinal': return <Heart className="h-4 w-4 text-purple-400" />;
      case 'cardiovascular': return <Heart className="h-4 w-4 text-red-400" />;
      case 'respiratory': return <AlertTriangle className="h-4 w-4 text-cyan-400" />;
      case 'neurological': return <Clock className="h-4 w-4 text-indigo-400" />;
      case 'psychiatric': return <Heart className="h-4 w-4 text-teal-400" />;
      case 'lifestyle': return '🏃‍♂️';
      case 'stress': return '🧘‍♀️';
      case 'sleep': return '😴';
      case 'nutrition': return '🥗';
      case 'exercise': return '💪';
      case 'mental_health': return '🧠';
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSolutionCategoryColor = (category: string) => {
    switch (category) {
      case 'lifestyle': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400';
      case 'stress': return 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400';
      case 'sleep': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400';
      case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400';
      case 'exercise': return 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400';
      case 'mental_health': return 'bg-pink-100 text-pink-800 dark:bg-pink-950/30 dark:text-pink-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'free': return 'AI Free Mode';
      case 'basic': return 'Basic';
      case 'pro': return 'Pro';
      default: return 'Health Topics';
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Health Topics</span>
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                  {getModeLabel()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshAnalysis();
                  }}
                  disabled={loading}
                  className="h-7 w-7 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                {topics.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    {topics.length}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground text-left">
              {patientName} • {conversationType === 'easy_chat' ? 'Guided conversation topics' : 'Chat analysis topics'}
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 p-0">
            <Tabs defaultValue="topics" className="h-full flex flex-col">
              <TabsList className={`grid w-full ${includeSolutions ? 'grid-cols-2' : 'grid-cols-1'} mx-6 mt-4 bg-muted/50`}>
                <TabsTrigger value="topics" className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Topics</span>
                  {!isEmpty && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {topics.length}
                    </Badge>
                  )}
                </TabsTrigger>
                {includeSolutions && (
                  <TabsTrigger value="solutions" className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm">
                    <Target className="h-4 w-4 flex-shrink-0" />
                    <span>Solutions</span>
                    {!solutionsEmpty && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        {solutions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="topics" className="flex-1 mt-3 mx-6 mb-4">
                <ScrollArea className="h-[500px] w-full rounded-md border border-border bg-background/50">
                  <div className="p-4 space-y-3">
                    {loading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Analyzing conversation...</p>
                      </div>
                    )}

                    {isEmpty && !loading && (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          No health topics identified yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversationType === 'easy_chat' 
                            ? 'Continue answering questions to see topics'
                            : 'Continue your conversation for personalized insights'
                          }
                        </p>
                      </div>
                    )}

                    {topics.map((topic, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 space-y-3 bg-card/50 hover:bg-card/80 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 mt-0.5">
                              {getCategoryIcon(topic.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm leading-tight text-foreground mb-2">
                                {topic.topic}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                {topic.reasoning}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-1 font-medium ${getConfidenceColor(topic.confidence)}`}
                            >
                              {Math.round(topic.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">Was this helpful?</span>
                          <div className="flex gap-1">
                            <Button
                              variant={feedback[topic.topic] === 'positive' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleTopicFeedback(topic.topic, 'positive')}
                              className="h-7 px-2"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={feedback[topic.topic] === 'negative' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => handleTopicFeedback(topic.topic, 'negative')}
                              className="h-7 px-2"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Medical Disclaimer */}
                    {topics.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">Important Disclaimer</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            These AI-generated health topics are for discussion purposes only and should not replace professional medical advice. 
                            Always consult with qualified healthcare providers for proper diagnosis and treatment.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {includeSolutions && (
                <TabsContent value="solutions" className="flex-1 mt-3 mx-6 mb-4">
                  <ScrollArea className="h-[500px] w-full rounded-md border border-border bg-background/50">
                    <div className="p-4 space-y-3">
                      {loading && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-xs text-muted-foreground">Analyzing for holistic solutions...</p>
                        </div>
                      )}

                      {solutionsEmpty && !loading && (
                        <div className="text-center py-8">
                          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            No holistic solutions identified yet
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Continue your conversation to receive personalized wellness suggestions
                          </p>
                          {mode === 'free' && (
                            <div className="text-xs mt-2 bg-muted/30 rounded p-2">
                              💡 Limited solutions in Free Mode - upgrade for comprehensive holistic recommendations
                            </div>
                          )}
                        </div>
                      )}

                      {solutions.map((solution, index) => (
                        <div key={index} className="border border-border rounded-lg p-4 space-y-3 bg-card/50 hover:bg-card/80 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 mt-0.5 text-lg">
                                {typeof getCategoryIcon(solution.category) === 'string' 
                                  ? getCategoryIcon(solution.category) 
                                  : getCategoryIcon(solution.category)
                                }
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={`text-xs ${getSolutionCategoryColor(solution.category)}`}>
                                    {solution.category.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-sm leading-tight text-foreground mb-2">
                                  {solution.solution}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                  {solution.reasoning}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs font-medium mb-1">
                                {getConfidenceLevel(solution.confidence)}
                              </div>
                              <Progress 
                                value={solution.confidence * 100} 
                                className="w-20 h-2"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">Was this helpful?</span>
                            <div className="flex gap-1">
                              <Button
                                variant={feedback[solution.solution] === 'helpful' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleSolutionFeedback(solution.solution, 'helpful')}
                                className="h-7 px-2"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant={feedback[solution.solution] === 'not_helpful' ? 'destructive' : 'outline'}
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

                      {/* Solutions Disclaimer */}
                      {solutions.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-border/50">
                          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Target className="h-3 w-3" />
                              <span className="font-medium">Holistic Wellness Suggestions</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              These are holistic wellness suggestions based on your conversation. 
                              They are not medical advice. Always consult healthcare professionals for medical concerns.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};