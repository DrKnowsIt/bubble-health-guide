import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Clock, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';

interface AIFreeModeTopicsPanelProps {
  conversationPath: Array<{ question: any; response: string }>;
  patientName: string;
  patientId: string;
  sessionId?: string;
  healthTopics?: GeneratedTopic[]; // Add healthTopics prop
}

interface GeneratedTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
}

export const AIFreeModeTopicsPanel: React.FC<AIFreeModeTopicsPanelProps> = ({
  conversationPath,
  patientName,
  patientId,
  sessionId,
  healthTopics = [] // Use provided topics or empty array
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [topics, setTopics] = useState<GeneratedTopic[]>(healthTopics);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0);

  // Update topics when healthTopics prop changes (from real-time generation)
  useEffect(() => {
    if (healthTopics && healthTopics.length > 0) {
      console.log('Received real-time health topics:', healthTopics);
      setTopics(healthTopics);
      setLastAnalyzedCount(conversationPath.length);
    }
  }, [healthTopics, conversationPath.length]);

  // Generate topics more frequently for better responsiveness
  useEffect(() => {
    // Skip if we already have topics from props and they're sufficient
    if (healthTopics && healthTopics.length >= 4) return;
    
    const shouldAnalyze = conversationPath.length > 0 && 
                         conversationPath.length !== lastAnalyzedCount && 
                         conversationPath.length >= 1; // Analyze after 1+ responses for better responsiveness

    console.log('📊 Topic generation check (fallback):', { 
      pathLength: conversationPath.length, 
      lastAnalyzed: lastAnalyzedCount, 
      shouldAnalyze, 
      sessionId,
      hasProvidedTopics: healthTopics && healthTopics.length >= 4,
      currentTopicsCount: topics.length,
      highConfidenceTopics: topics.filter(t => t.confidence >= 0.7).length
    });

    if (shouldAnalyze && sessionId) {
      console.log('🚀 Triggering topic generation...');
      generateTopics();
    }
  }, [conversationPath.length, sessionId, lastAnalyzedCount, healthTopics]);

  const generateTopics = async () => {
    if (!user || conversationPath.length === 0) return;

    try {
      setLoading(true);
      console.log('Generating topics for AI Free Mode conversation...', { 
        pathLength: conversationPath.length, 
        patientId, 
        sessionId 
      });

      const conversationContext = conversationPath.map(item => 
        `Q: ${item.question?.question_text || 'Question'}\nA: ${item.response}`
      ).join('\n\n');

      console.log('Conversation context:', conversationContext.substring(0, 200) + '...');

      // Get current user as fallback for patient_id
      const { data: { user } } = await supabase.auth.getUser();
      const effectivePatientId = patientId || user?.id || '';
      
      console.log('Calling analyze-health-topics with:', {
        contextLength: conversationContext.length,
        patientId: effectivePatientId,
        hasUser: !!user
      });

      const { data, error } = await supabase.functions.invoke('analyze-health-topics', {
        body: {
          conversation_context: conversationContext,
          patient_id: effectivePatientId,
          conversation_type: 'easy_chat',
          mode: 'free'
        }
      });

      if (error) {
        console.error('Error generating topics:', error);
        console.error('Error details:', error);
        return;
      }

      console.log('📋 Response from analyze-health-topics:', data);

      if (data?.diagnoses || data?.topics) {
        const topicsData = data.diagnoses || data.topics;
        // Show all topics without any filtering - the server ensures exactly 4
        const generatedTopics = topicsData
          .map((item: any) => ({
            topic: item.topic || item.diagnosis,
            confidence: item.confidence || 0.5,
            reasoning: item.reasoning || 'Based on conversation responses',
            category: item.category || 'other'
          }));

        console.log('✅ Generated topics analysis:', {
          totalTopics: generatedTopics.length,
          highConfidenceCount: generatedTopics.filter(t => t.confidence >= 0.7).length,
          mediumConfidenceCount: generatedTopics.filter(t => t.confidence >= 0.4 && t.confidence < 0.7).length,
          lowConfidenceCount: generatedTopics.filter(t => t.confidence < 0.4).length,
          categories: generatedTopics.map(t => t.category),
          topics: generatedTopics.map(t => ({ topic: t.topic, confidence: t.confidence }))
        });

        setTopics(generatedTopics); // Show all topics returned from server (always 4)
        setLastAnalyzedCount(conversationPath.length);
        console.log('📊 Generated topics with debug info:', generatedTopics);
      } else {
        console.log('❌ No topics data in response - raw response:', data);
      }
    } catch (error) {
      console.error('Error in topic generation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50';
    if (confidence >= 0.4) return 'text-amber-400 bg-amber-950/30 border-amber-800/50';
    return 'text-red-400 bg-red-950/30 border-red-800/50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'musculoskeletal': return <Target className="h-4 w-4 text-blue-400" />;
      case 'dermatological': return <Layers className="h-4 w-4 text-emerald-400" />;
      case 'gastrointestinal': return <Heart className="h-4 w-4 text-purple-400" />;
      case 'cardiovascular': return <Heart className="h-4 w-4 text-red-400" />;
      case 'respiratory': return <AlertTriangle className="h-4 w-4 text-cyan-400" />;
      case 'neurological': return <Clock className="h-4 w-4 text-indigo-400" />;
      case 'genitourinary': return <Target className="h-4 w-4 text-pink-400" />;
      case 'endocrine': return <Layers className="h-4 w-4 text-orange-400" />;
      case 'psychiatric': return <Heart className="h-4 w-4 text-teal-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-full flex flex-col bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border">
            <CardTitle className="flex items-start justify-between text-lg gap-3 min-h-[2.5rem]">
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                <Target className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-semibold text-foreground whitespace-nowrap">Health Topics</span>
                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground flex-shrink-0">
                  AI Free Mode
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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
            <p className="text-sm text-muted-foreground text-left truncate">
              <span className="inline-block max-w-[150px] truncate">{patientName}</span> • Topics from your guided conversation
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 p-0">
            <Tabs defaultValue="topics" className="h-full flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-1 mx-3 my-3 mb-0 bg-muted/50">
                <TabsTrigger value="topics" className="text-sm px-3">
                  Health Topics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="flex-1 mt-3 mx-3 mb-3 min-h-0">
                <ScrollArea className="h-full max-h-[calc(100vh-280px)] w-full rounded-md border border-border bg-background/50 [&>[data-radix-scroll-area-scrollbar]]:bg-muted/30 [&>[data-radix-scroll-area-scrollbar]>[data-radix-scroll-area-thumb]]:bg-muted-foreground/50">
                  <div className="p-4 space-y-3 pb-6">
                    {loading && conversationPath.length > 0 && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-xs text-muted-foreground">Analyzing conversation...</p>
                      </div>
                    )}

                    {topics.length === 0 && !loading && conversationPath.length > 0 && (
                      <div className="text-center py-8">
                        <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Keep answering questions to see health topics
                        </p>
                      </div>
                    )}

                    {topics.length === 0 && conversationPath.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Health topics will appear as you progress through the guided chat
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
                              <p className="text-xs text-muted-foreground leading-relaxed">
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
                      </div>
                    ))}

                    {/* Bottom disclaimer - always visible when scrolled to bottom */}
                    {topics.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">Important Disclaimer</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            These AI-generated health topics are for discussion purposes only and should not replace professional medical advice. 
                            Always consult with qualified healthcare providers for proper diagnosis and treatment. Bring these topics to your doctor visit for professional evaluation.
                          </p>
                          <div className="flex items-center justify-center pt-2">
                            <Badge variant="outline" className="text-xs bg-background/50">
                              💡 Generated from your conversation responses
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};