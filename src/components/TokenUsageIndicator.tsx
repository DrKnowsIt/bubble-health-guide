import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Zap } from 'lucide-react';
import { useTokenUsageOptimization } from '@/hooks/useTokenUsageOptimization';

export const TokenUsageIndicator: React.FC = () => {
  const { dailyUsage, tokenWarningThreshold, isApproachingLimit, loading } = useTokenUsageOptimization();

  if (loading || !dailyUsage) {
    return null;
  }

  const usagePercent = Math.min((dailyUsage.messages_used / tokenWarningThreshold) * 100, 100);
  const remainingMessages = Math.max(0, tokenWarningThreshold - dailyUsage.messages_used);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Daily Usage</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isApproachingLimit ? "destructive" : "secondary"} className="text-xs">
              {dailyUsage.messages_used}/{tokenWarningThreshold}
            </Badge>
          </div>
        </div>
        
        <Progress 
          value={usagePercent} 
          className={`h-2 ${isApproachingLimit ? 'bg-red-100' : 'bg-green-100'}`}
        />
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{remainingMessages} messages remaining</span>
          {isApproachingLimit && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Almost full</span>
            </div>
          )}
        </div>

        {dailyUsage.tokens_used > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            Token usage: {dailyUsage.tokens_used.toLocaleString()} | Cost: ${dailyUsage.cost_incurred.toFixed(4)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};