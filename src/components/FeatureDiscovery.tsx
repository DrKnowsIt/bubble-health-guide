import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  MessageSquare, 
  Upload, 
  Brain, 
  Activity, 
  Calendar,
  FileText,
  Users,
  Crown,
  X
} from 'lucide-react';

interface FeatureTip {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'getting-started' | 'advanced' | 'pro-feature';
  actionText?: string;
  onAction?: () => void;
}

interface FeatureDiscoveryProps {
  onNavigateToTab?: (tab: string) => void;
}

export const FeatureDiscovery = ({ onNavigateToTab }: FeatureDiscoveryProps) => {
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  const featureTips: FeatureTip[] = [
    {
      id: 'ai-chat',
      title: 'Start Your First AI Conversation',
      description: 'Chat with DrKnowsIt about symptoms, medications, or health concerns for personalized guidance.',
      icon: MessageSquare,
      category: 'getting-started',
      actionText: 'Start Chatting',
      onAction: () => onNavigateToTab?.('chat')
    },
    {
      id: 'health-forms',
      title: 'Complete Health Forms',
      description: 'Fill out structured forms to provide comprehensive health data for better AI insights.',
      icon: Calendar,
      category: 'getting-started',
      actionText: 'Fill Forms',
      onAction: () => onNavigateToTab?.('forms')
    },
    {
      id: 'upload-records',
      title: 'Upload Health Records',
      description: 'Upload lab results, medical reports, or other health documents for AI analysis.',
      icon: Upload,
      category: 'getting-started',
      actionText: 'Upload Records',
      onAction: () => onNavigateToTab?.('health')
    },
    {
      id: 'ai-memory',
      title: 'Customize AI Memory',
      description: 'Adjust how the AI remembers your health information and personalizes responses.',
      icon: Brain,
      category: 'advanced',
      actionText: 'Configure AI',
      onAction: () => onNavigateToTab?.('ai-settings')
    },
    {
      id: 'user-management',
      title: 'Add Family Members',
      description: 'Create profiles for family members to track their health information separately.',
      icon: Users,
      category: 'advanced',
      actionText: 'Manage Users',
      onAction: () => onNavigateToTab?.('overview')
    },
    {
      id: 'comprehensive-forms',
      title: 'Access All Health Forms',
      description: 'Upgrade to Pro to access detailed nutrition, genetics, and lifestyle assessment forms.',
      icon: Crown,
      category: 'pro-feature',
      actionText: 'Upgrade to Pro'
    }
  ];

  const activeTips = featureTips.filter(tip => !dismissedTips.includes(tip.id));

  const dismissTip = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting-started':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'advanced':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pro-feature':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (activeTips.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Discover Features
        </CardTitle>
        <CardDescription>
          Learn about DrKnowsIt's capabilities to get the most out of your health journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeTips.slice(0, 3).map((tip) => (
            <div key={tip.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
              <tip.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{tip.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 ${getCategoryColor(tip.category)}`}
                      >
                        {tip.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{tip.description}</p>
                    <div className="flex items-center gap-2">
                      {tip.actionText && tip.onAction && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={tip.onAction}
                          className="text-xs"
                        >
                          {tip.actionText}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissTip(tip.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {activeTips.length > 3 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {activeTips.length - 3} more tips available
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};