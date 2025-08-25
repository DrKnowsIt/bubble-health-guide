import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, AlertTriangle, ChevronDown, ChevronUp, Heart, Target, Clock, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';

interface EasyChatTopicsPanelProps {
  conversationPath: Array<{ question: any; response: string }>;
  patientName: string;
  patientId: string;
  sessionId?: string;
}

interface GeneratedTopic {
  topic: string;
  confidence: number;
  reasoning: string;
  category: string;
}

export const EasyChatTopicsPanel: React.FC<EasyChatTopicsPanelProps> = ({
  conversationPath,
  patientName,
  patientId,
  sessionId
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [topics, setTopics] = useState<GeneratedTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzedCount, setLastAnalyzedCount] = useState(0);

  // Generate topics when we have enough new responses
  useEffect(() => {
    const shouldAnalyze = conversationPath.length > 0 && 
                         conversationPath.length !== lastAnalyzedCount && 
                         conversationPath.length % 2 === 0; // Every 2 responses

    if (shouldAnalyze && sessionId) {
      generateTopics();
    }
  }, [conversationPath.length, sessionId, lastAnalyzedCount]);

  const generateTopics = async () => {
    if (!user || conversationPath.length === 0) return;

    try {
      setLoading(true);
      console.log('Generating topics for Easy Chat conversation...');

      const conversationContext = conversationPath.map(item => 
        `Q: ${item.question?.question_text || 'Question'}\nA: ${item.response}`
      ).join('\n\n');

      const { data, error } = await supabase.functions.invoke('analyze-conversation-diagnosis', {
        body: {
          conversation_context: conversationContext,
          patient_id: patientId,
          conversation_type: 'easy_chat'
        }
      });

      if (error) {
        console.error('Error generating topics:', error);
        return;
      }

      if (data?.diagnoses) {
        const generatedTopics = data.diagnoses.map((diagnosis: any) => ({
          topic: diagnosis.diagnosis,
          confidence: diagnosis.confidence || 0.5,
          reasoning: diagnosis.reasoning || 'Based on conversation responses',
          category: diagnosis.confidence > 0.7 ? 'high_confidence' : 
                   diagnosis.confidence > 0.4 ? 'moderate_confidence' : 'low_confidence'
        }));

        setTopics(generatedTopics.slice(0, 5)); // Limit to 5 topics
        setLastAnalyzedCount(conversationPath.length);
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
      case 'high_confidence': return <AlertTriangle className="h-4 w-4 text-green-600" />;
      case 'moderate_confidence': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'low_confidence': return <Layers className="h-4 w-4 text-red-600" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Health Topics
                <Badge variant="secondary" className="text-xs">
                  Easy Chat
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
          <CardContent className="flex-1 overflow-hidden">
            <Tabs defaultValue="topics" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="topics" className="text-sm">
                  Health Topics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="flex-1 overflow-y-auto mt-3 space-y-3">
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};