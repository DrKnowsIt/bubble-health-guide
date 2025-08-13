import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Clock, 
  Activity, 
  User, 
  Heart, 
  FileText,
  TrendingUp
} from 'lucide-react';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { cn } from '@/lib/utils';

interface PatientMemoryOverviewProps {
  patientId?: string;
  patientName?: string;
}

export const PatientMemoryOverview = ({ patientId, patientName }: PatientMemoryOverviewProps) => {
  const { 
    insights, 
    loading, 
    getMemoryStats, 
    getRecentInsights,
    formatInsightValue 
  } = useConversationMemory(patientId);

  const stats = getMemoryStats();
  const recentInsights = getRecentInsights(3);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical_fact':
        return <Heart className="h-3 w-3" />;
      case 'symptom':
        return <Activity className="h-3 w-3" />;
      case 'preference':
        return <User className="h-3 w-3" />;
      case 'history':
        return <Clock className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medical_fact':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      case 'symptom':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'preference':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'history':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!patientId) {
    return (
      <Card className="bg-gradient-to-br from-muted/5 to-muted/10 border-muted/20">
        <CardContent className="p-6 text-center">
          <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Select a patient to view their conversation memory
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats.hasMemories) {
    return (
      <Card className="bg-gradient-to-br from-muted/5 to-muted/10 border-muted/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            AI Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No conversation memory yet for {patientName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start chatting to build AI memory
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Memory
          {patientName && (
            <Badge variant="outline" className="ml-2 text-xs">
              {patientName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Memory Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-background/50 rounded-lg border border-primary/10">
            <div className="text-lg font-bold text-primary">{stats.totalInsights}</div>
            <div className="text-xs text-muted-foreground">Insights</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg border border-primary/10">
            <div className="text-lg font-bold text-primary">{stats.totalMemories}</div>
            <div className="text-xs text-muted-foreground">Conversations</div>
          </div>
        </div>

        {/* Category Distribution */}
        {Object.keys(stats.categories).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Memory Categories
            </h4>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.categories).map(([category, count]) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className={cn("text-xs", getCategoryColor(category))}
                >
                  {getCategoryIcon(category)}
                  <span className="ml-1 capitalize">
                    {category.replace('_', ' ')}: {count}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Insights */}
        {recentInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Insights
            </h4>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {recentInsights.map((insight, index) => (
                  <div key={`${insight.conversation_id}-${insight.key}-${index}`} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-xs h-5", getCategoryColor(insight.category))}
                          >
                            {getCategoryIcon(insight.category)}
                            <span className="ml-1 capitalize">
                              {insight.key.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">
                          {formatInsightValue(insight.value)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(insight.timestamp)}
                      </div>
                    </div>
                    {index < recentInsights.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Last Update */}
        {stats.lastMemoryUpdate && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-primary/10">
            Last updated: {formatTimestamp(stats.lastMemoryUpdate.toISOString())}
          </div>
        )}
      </CardContent>
    </Card>
  );
};