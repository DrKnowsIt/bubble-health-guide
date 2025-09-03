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
      
      console.log('Calling analyze-easy-chat-topics with:', {
        contextLength: conversationContext.length,
        patientId: effectivePatientId,
        hasUser: !!user
      });

      const { data, error } = await supabase.functions.invoke('analyze-easy-chat-topics', {
        body: {
          conversation_context: conversationContext,
          patient_id: effectivePatientId,
          conversation_type: 'easy_chat'
        }
      });

      if (error) {
        console.error('Error generating topics:', error);
        console.error('Error details:', error);
        return;
      }

      console.log('📋 Response from analyze-easy-chat-topics:', data);

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
    if (confidence >= 0.7) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.4) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'musculoskeletal': return <Target className="h-4 w-4 text-blue-600" />;
      case 'dermatological': return <Layers className="h-4 w-4 text-green-600" />;
      case 'gastrointestinal': return <Heart className="h-4 w-4 text-purple-600" />;
      case 'cardiovascular': return <Heart className="h-4 w-4 text-red-600" />;
      case 'respiratory': return <AlertTriangle className="h-4 w-4 text-cyan-600" />;
      case 'neurological': return <Clock className="h-4 w-4 text-indigo-600" />;
      case 'genitourinary': return <Target className="h-4 w-4 text-pink-600" />;
      case 'endocrine': return <Layers className="h-4 w-4 text-orange-600" />;
      case 'psychiatric': return <Heart className="h-4 w-4 text-teal-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors border-b">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-semibold">Health Topics</span>
                <Badge variant="secondary" className="text-xs">
                  AI Free Mode
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {topics.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {topics.length}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground text-left">
              {patientName} • Topics from your guided conversation
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              <Tabs defaultValue="topics" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="topics" className="text-sm">
                    Health Topics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="topics" className="flex-1 mt-3">
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3">
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
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {getCategoryIcon(topic.category)}
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm leading-tight">
                                  {topic.topic}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {topic.reasoning}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-2 py-1 border ${getConfidenceColor(topic.confidence)}`}
                            >
                              {Math.round(topic.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}

                      {topics.length > 0 && (
                        <div className="text-xs text-muted-foreground text-center py-2 border-t">
                          💡 These topics are based on your responses in the guided conversation
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};