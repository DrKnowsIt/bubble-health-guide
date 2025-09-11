import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Clock, Layers, RefreshCw, ShoppingBag } from 'lucide-react';
import { ProductCard } from '@/components/ui/product-card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHealthTopics } from '@/hooks/useHealthTopics';
import { useSubscription } from '@/hooks/useSubscription';

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
  const { subscription_tier } = useSubscription();
  
  // Determine actual mode based on subscription
  const actualMode = subscription_tier || 'free';

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

  // Auto-refresh solutions when topics change significantly
  useEffect(() => {
    if (topics.length > 0 && includeSolutions && conversationType === 'easy_chat') {
      const timer = setTimeout(() => {
        refreshAnalysis();
        console.log('Auto-refreshing solutions based on updated topics');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [topics.length, refreshAnalysis, includeSolutions, conversationType]);

  const getConfidenceColor = (confidence: number, tier: string = actualMode) => {
    // Tier-aware confidence styling
    if (tier === 'pro') {
      if (confidence >= 0.7) return 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50 font-semibold';
      if (confidence >= 0.5) return 'text-amber-400 bg-amber-950/30 border-amber-800/50 font-medium';
      return 'text-orange-400 bg-orange-950/30 border-orange-800/50';
    } else if (tier === 'basic') {
      if (confidence >= 0.5) return 'text-blue-400 bg-blue-950/30 border-blue-800/50 font-medium';
      if (confidence >= 0.3) return 'text-cyan-400 bg-cyan-950/30 border-cyan-800/50';
      return 'text-slate-400 bg-slate-950/30 border-slate-800/50';
    } else { // free
      if (confidence >= 0.3) return 'text-purple-400 bg-purple-950/30 border-purple-800/50';
      if (confidence >= 0.2) return 'text-indigo-400 bg-indigo-950/30 border-indigo-800/50';
      return 'text-gray-400 bg-gray-950/30 border-gray-800/50';
    }
  };

  const getConfidenceLevel = (confidence: number, tier: string = actualMode): string => {
    if (tier === 'pro') {
      if (confidence >= 0.7) return "High Confidence";
      if (confidence >= 0.5) return "Moderate";
      return "Exploratory";
    } else if (tier === 'basic') {
      if (confidence >= 0.5) return "Moderate";
      if (confidence >= 0.3) return "Worth Exploring";
      return "Low";
    } else { // free
      if (confidence >= 0.3) return "Worth Discussing";
      if (confidence >= 0.2) return "Consider";
      return "Preliminary";
    }
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
    switch (actualMode) {
      case 'free': return 'Free Mode';
      case 'basic': return 'Basic Analysis';
      case 'pro': return 'Pro Analysis';
      default: return 'Health Topics';
    }
  };

  const getConfidenceMessage = () => {
    switch (actualMode) {
      case 'free': return 'Based on limited information (10-40% confidence range)';
      case 'basic': return 'With basic patient data (20-60% confidence range)';
      case 'pro': return 'With comprehensive analysis (30-80% confidence range)';
      default: return 'AI-generated health insights';
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
              {patientName} • {getConfidenceMessage()}
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

                    {topics.map((topic, index) => {
                      const confidenceSize = topic.confidence >= 0.6 ? 'p-5' : topic.confidence >= 0.4 ? 'p-4' : 'p-3';
                      const titleSize = topic.confidence >= 0.6 ? 'text-base font-semibold' : topic.confidence >= 0.4 ? 'text-sm font-medium' : 'text-sm';
                      
                      return (
                        <div key={index} className={`border border-border rounded-lg ${confidenceSize} space-y-3 bg-card/50 hover:bg-card/80 transition-all duration-200 ${topic.confidence >= 0.6 ? 'ring-1 ring-primary/20' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 mt-0.5">
                                {getCategoryIcon(topic.category)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className={`leading-tight text-foreground ${titleSize}`}>
                                    {topic.topic.length > 80 ? `${topic.topic.substring(0, 80)}...` : topic.topic}
                                  </h4>
                                  {topic.confidence >= 0.6 && (
                                    <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
                                      Priority
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                  {topic.reasoning.length > 150 ? `${topic.reasoning.substring(0, 150)}...` : topic.reasoning}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs font-medium mb-1 text-muted-foreground">
                                {getConfidenceLevel(topic.confidence, actualMode)}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-2 py-1 ${getConfidenceColor(topic.confidence, actualMode)}`}
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
                      );
                    })}

                    {/* Medical Disclaimer */}
                    {topics.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">Important Disclaimer</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {actualMode === 'free' 
                              ? 'These preliminary AI insights (10-40% confidence) are for initial discussion only. Upgrade for more confident analysis or consult healthcare providers.'
                              : actualMode === 'basic'
                              ? 'These AI-generated topics (20-60% confidence) are for discussion purposes. Always consult qualified healthcare providers for diagnosis and treatment.'
                              : 'These comprehensive AI insights (30-80% confidence) support informed discussions with healthcare providers. Always seek professional medical advice for diagnosis and treatment.'
                            }
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
                          {actualMode === 'free' && (
                            <div className="text-xs mt-3 bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-800/30 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-400">✨</span>
                                <span className="font-medium text-purple-200">Limited Solutions in Free Mode</span>
                              </div>
                              <p className="text-xs text-purple-300">
                                Get more confident holistic recommendations with Basic or Pro plans
                              </p>
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
                                
                                {/* Product Suggestions */}
                                {solution.products && solution.products.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Helpful Products
                                      </span>
                                    </div>
                                    <div className="grid gap-2">
                                      {solution.products.slice(0, 2).map((product, productIndex) => (
                                        <ProductCard 
                                          key={productIndex} 
                                          product={product}
                                          showDisclaimer={true}
                                        />
                                      ))}
                                    </div>
                                    <div className="text-xs text-muted-foreground/80 mt-2 p-2 bg-muted/20 rounded border border-border/30">
                                      <div className="flex items-center gap-1 mb-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span className="font-medium">Product Disclaimer</span>
                                      </div>
                                      <p className="leading-relaxed">
                                        These are general product suggestions. Consult healthcare providers before purchasing health-related items. We're not affiliated with Amazon.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs font-medium mb-1 text-muted-foreground">
                                {getConfidenceLevel(solution.confidence, actualMode)}
                              </div>
                              <Progress 
                                value={solution.confidence * 100} 
                                className="w-20 h-2"
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                {Math.round(solution.confidence * 100)}%
                              </div>
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
                              <span className="font-medium">Wellness Guidance</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {actualMode === 'free' 
                                ? 'These preliminary wellness suggestions (10-40% confidence) are general recommendations. Upgrade for personalized holistic solutions.'
                                : actualMode === 'basic'  
                                ? 'These holistic solutions (20-60% confidence) are lifestyle suggestions only. Consult healthcare providers for medical concerns.'
                                : 'These comprehensive wellness recommendations (30-80% confidence) support holistic health approaches. Always seek professional guidance for medical conditions.'
                              }
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