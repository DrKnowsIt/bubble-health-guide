import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageSquare, 
  Image as ImageIcon, 
  ShoppingBag, 
  FileText, 
  Users,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface ConversationFlowIndicatorProps {
  mode: 'free' | 'basic' | 'pro';
  messageCount: number;
  analysisState: {
    isAnalyzing: boolean;
    messagesUntilAnalysis: number;
    messagesUntilDeepAnalysis: number;
  };
  hasHealthTopics: boolean;
  hasImagePrompts: boolean;
  hasAmazonProducts: boolean;
  hasHealthForms: boolean;
}

export const ConversationFlowIndicator: React.FC<ConversationFlowIndicatorProps> = ({
  mode,
  messageCount,
  analysisState,
  hasHealthTopics,
  hasImagePrompts,
  hasAmazonProducts,
  hasHealthForms
}) => {
  const getFeatureStatus = (enabled: boolean, available: boolean = true) => {
    if (!available) return { color: 'text-muted-foreground', icon: 'unavailable' };
    if (enabled) return { color: 'text-green-600', icon: 'active' };
    return { color: 'text-amber-600', icon: 'pending' };
  };

  const features = [
    {
      name: 'Health Topics Analysis',
      icon: <Brain className="h-4 w-4" />,
      description: 'AI identifies health topics every message',
      ...getFeatureStatus(hasHealthTopics),
      available: true
    },
    {
      name: 'Medical Image Prompts',
      icon: <ImageIcon className="h-4 w-4" />,
      description: 'Visual symptom comparison at 60% confidence',
      ...getFeatureStatus(hasImagePrompts),
      available: true
    },
    {
      name: 'Amazon Product Suggestions',
      icon: <ShoppingBag className="h-4 w-4" />,
      description: 'Relevant health products with links',
      ...getFeatureStatus(hasAmazonProducts),
      available: mode !== 'free'
    },
    {
      name: 'Health Forms Integration',
      icon: <FileText className="h-4 w-4" />,
      description: 'Immediate re-analysis when forms are saved',
      ...getFeatureStatus(hasHealthForms),
      available: mode !== 'free'
    },
    {
      name: 'User Switching',
      icon: <Users className="h-4 w-4" />,
      description: 'Seamless context switching between patients',
      ...getFeatureStatus(true), // Always enabled
      available: true
    }
  ];

  const getModeColor = () => {
    switch (mode) {
      case 'pro': return 'bg-gradient-to-r from-purple-600 to-blue-600';
      case 'basic': return 'bg-gradient-to-r from-blue-600 to-cyan-600';
      default: return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-background to-muted/30 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${getModeColor()} text-white px-3 py-1 rounded-full text-sm font-medium`}>
              {mode.toUpperCase()} Mode
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{messageCount} messages</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {analysisState.isAnalyzing ? (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full mr-1"></div>
                Analyzing
              </Badge>
            ) : analysisState.messagesUntilAnalysis === 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Zap className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Next: {analysisState.messagesUntilAnalysis}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Natural Conversation Features</h3>
          <div className="grid gap-2">
            {features.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <div className={feature.color}>
                    {feature.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{feature.name}</div>
                    <div className="text-xs text-muted-foreground">{feature.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {!feature.available ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {mode.toUpperCase()}+ only
                    </Badge>
                  ) : feature.icon === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : feature.icon === 'pending' ? (
                    <Clock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Natural Conversation Flow:</strong> Analysis triggers every message (reduced from every 2), 
            medical images show at 60% confidence (reduced from 80%), and health forms immediately refresh insights.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};