import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Stethoscope,
  Target,
  Calendar,
  Database,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Zap,
  Shield,
  Activity
} from 'lucide-react';

interface EnhancedHealthTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
  priority_level: 'high' | 'medium' | 'low';
  data_sources: string[];
  risk_factors?: string[];
  recommendations?: string[];
  follow_up_required?: boolean;
}

interface EnhancedHealthSolution {
  solution: string;
  confidence: number;
  reasoning: string;
  category: string;
  timeline: 'immediate' | 'short_term' | 'long_term';
  evidence_strength: 'strong' | 'moderate' | 'weak';
  contraindications?: string[];
  monitoring_required?: boolean;
}

interface EnhancedHealthTopicsPanelProps {
  topics: EnhancedHealthTopic[];
  solutions: EnhancedHealthSolution[];
  loading: boolean;
  feedback: {
    topics: { [key: string]: 'positive' | 'negative' };
    solutions: { [key: string]: 'helpful' | 'not_helpful' };
  };
  highPriorityTopics: EnhancedHealthTopic[];
  followUpRequired: EnhancedHealthTopic[];
  immediateActions: EnhancedHealthSolution[];
  totalDataSources: number;
  onTopicFeedback: (topic: string, feedback: 'positive' | 'negative') => void;
  onSolutionFeedback: (solution: string, feedback: 'helpful' | 'not_helpful') => void;
  onRefresh: () => void;
  patientName?: string;
}

export const EnhancedHealthTopicsPanel: React.FC<EnhancedHealthTopicsPanelProps> = ({
  topics = [],
  solutions = [],
  loading,
  feedback = { topics: {}, solutions: {} },
  highPriorityTopics = [],
  followUpRequired = [],
  immediateActions = [],
  totalDataSources = 0,
  onTopicFeedback,
  onSolutionFeedback,
  onRefresh,
  patientName
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cardiovascular': return Heart;
      case 'neurological': return Brain;
      case 'respiratory': return Activity;
      case 'gastrointestinal': return Target;
      case 'mental_health': return Brain;
      case 'preventive': return Shield;
      default: return Stethoscope;
    }
  };

  const getTimelineIcon = (timeline: string) => {
    switch (timeline) {
      case 'immediate': return Zap;
      case 'short_term': return Clock;
      case 'long_term': return Calendar;
      default: return Clock;
    }
  };

  const getTimelineColor = (timeline: string) => {
    switch (timeline) {
      case 'immediate': return 'destructive';
      case 'short_term': return 'default';
      case 'long_term': return 'secondary';
      default: return 'outline';
    }
  };

  const getEvidenceColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'default';
      case 'moderate': return 'secondary';
      case 'weak': return 'outline';
      default: return 'outline';
    }
  };

  const toggleTopicExpansion = (topic: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  const toggleSolutionExpansion = (solution: string) => {
    const newExpanded = new Set(expandedSolutions);
    if (newExpanded.has(solution)) {
      newExpanded.delete(solution);
    } else {
      newExpanded.add(solution);
    }
    setExpandedSolutions(newExpanded);
  };

  if (loading && topics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Comprehensive Health Analysis
            <Badge variant="outline" className="ml-auto">
              <Brain className="h-3 w-3 mr-1" />
              AI Enhanced
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 animate-pulse" />
              <span className="text-sm text-muted-foreground">Analyzing comprehensive health data...</span>
            </div>
            <Progress value={33} className="animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
      <Card className="w-full">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold">Health Analysis</span>
                  {patientName && (
                    <span className="text-sm text-muted-foreground">for {patientName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loading && <Sparkles className="h-4 w-4 animate-spin" />}
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
                {totalDataSources > 0 && (
                  <Badge variant="secondary">
                    <Database className="h-3 w-3 mr-1" />
                    {totalDataSources} Data Sources
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {/* Summary Stats */}
            {(highPriorityTopics.length > 0 || followUpRequired.length > 0 || immediateActions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {highPriorityTopics.length > 0 && (
                  <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">High Priority</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive mt-1">{highPriorityTopics.length}</p>
                  </div>
                )}
                
                {followUpRequired.length > 0 && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Follow-up Required</span>
                    </div>
                    <p className="text-2xl font-bold text-primary mt-1">{followUpRequired.length}</p>
                  </div>
                )}

                {immediateActions.length > 0 && (
                  <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/20 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium">Immediate Actions</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{immediateActions.length}</p>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="topics" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="topics" className="flex items-center gap-1 px-2 py-2 min-w-0">
                  <Target className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">Health Topics ({topics.length})</span>
                </TabsTrigger>
                <TabsTrigger value="solutions" className="flex items-center gap-1 px-2 py-2 min-w-0">
                  <TrendingUp className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">Solutions ({solutions.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="space-y-4">
                {topics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No health topics identified yet.</p>
                    <p className="text-sm">Continue the conversation for more insights.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {topics.map((topic, index) => {
                        const CategoryIcon = getCategoryIcon(topic.category);
                        const isExpanded = expandedTopics.has(topic.topic);
                        const topicFeedback = feedback.topics[topic.topic];

                        return (
                          <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <CategoryIcon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium text-sm leading-tight">{topic.topic}</h4>
                                    <Badge variant={getPriorityColor(topic.priority_level)} className="text-xs">
                                      {topic.priority_level}
                                    </Badge>
                                    {topic.follow_up_required && (
                                      <Badge variant="outline" className="text-xs">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Follow-up
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mb-2">
                                    <Progress value={topic.confidence * 100} className="flex-1 h-2" />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {Math.round(topic.confidence * 100)}%
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {(topic.data_sources || []).map((source, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleTopicExpansion(topic.topic)}
                                    className="text-xs h-6 px-2"
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Details
                                  </Button>

                                  {isExpanded && (
                                    <div className="mt-3 space-y-3 text-sm">
                                      <div>
                                        <p className="font-medium mb-1">Reasoning:</p>
                                        <p className="text-muted-foreground">{topic.reasoning}</p>
                                      </div>
                                      
                                      {topic.risk_factors && topic.risk_factors.length > 0 && (
                                        <div>
                                          <p className="font-medium mb-1">Risk Factors:</p>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {topic.risk_factors.map((factor, idx) => (
                                              <li key={idx}>{factor}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {topic.recommendations && topic.recommendations.length > 0 && (
                                        <div>
                                          <p className="font-medium mb-1">Recommendations:</p>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {topic.recommendations.map((rec, idx) => (
                                              <li key={idx}>{rec}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={topicFeedback === 'positive' ? 'default' : 'outline'}
                                  onClick={() => onTopicFeedback(topic.topic, 'positive')}
                                  className="h-8 w-8 p-0"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={topicFeedback === 'negative' ? 'destructive' : 'outline'}
                                  onClick={() => onTopicFeedback(topic.topic, 'negative')}
                                  className="h-8 w-8 p-0"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="solutions" className="space-y-4">
                {solutions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No solutions available yet.</p>
                    <p className="text-sm">Health topics will generate personalized solutions.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {solutions.map((solution, index) => {
                        const TimelineIcon = getTimelineIcon(solution.timeline);
                        const isExpanded = expandedSolutions.has(solution.solution);
                        const solutionFeedback = feedback.solutions[solution.solution];

                        return (
                          <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <TimelineIcon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium text-sm leading-tight">{solution.solution}</h4>
                                    <Badge variant={getTimelineColor(solution.timeline)} className="text-xs">
                                      {(solution.timeline || 'unknown').replace('_', ' ')}
                                    </Badge>
                                    <Badge variant={getEvidenceColor(solution.evidence_strength)} className="text-xs">
                                      {(solution.evidence_strength || 'unknown')} evidence
                                    </Badge>
                                    {solution.monitoring_required && (
                                      <Badge variant="outline" className="text-xs">
                                        <Activity className="h-3 w-3 mr-1" />
                                        Monitor
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mb-2">
                                    <Progress value={solution.confidence * 100} className="flex-1 h-2" />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {Math.round(solution.confidence * 100)}%
                                    </span>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSolutionExpansion(solution.solution)}
                                    className="text-xs h-6 px-2"
                                  >
                                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Details
                                  </Button>

                                  {isExpanded && (
                                    <div className="mt-3 space-y-3 text-sm">
                                      <div>
                                        <p className="font-medium mb-1">Reasoning:</p>
                                        <p className="text-muted-foreground">{solution.reasoning}</p>
                                      </div>
                                      
                                      {solution.contraindications && solution.contraindications.length > 0 && (
                                        <div>
                                          <p className="font-medium mb-1 text-destructive">Contraindications:</p>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {solution.contraindications.map((contra, idx) => (
                                              <li key={idx}>{contra}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={solutionFeedback === 'helpful' ? 'default' : 'outline'}
                                  onClick={() => onSolutionFeedback(solution.solution, 'helpful')}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={solutionFeedback === 'not_helpful' ? 'destructive' : 'outline'}
                                  onClick={() => onSolutionFeedback(solution.solution, 'not_helpful')}
                                  className="h-8 w-8 p-0"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>AI-generated insights. Not a substitute for professional medical advice.</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                disabled={loading}
                className="h-6 text-xs"
              >
                {loading ? <Sparkles className="h-3 w-3 animate-spin mr-1" /> : null}
                Refresh Analysis
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};