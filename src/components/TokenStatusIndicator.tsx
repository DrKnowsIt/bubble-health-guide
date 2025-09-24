import { useEffect, useState } from 'react';
import { useTokenLimiting } from '@/hooks/useTokenLimiting';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatTimeUntilReset, TOKEN_LIMIT } from '@/utils/tokenLimiting';
import { Clock, Zap } from 'lucide-react';

export const TokenStatusIndicator = () => {
  const isMobile = useIsMobile();
  const { tokenStatus, canChat, currentTokens, timeUntilReset } = useTokenLimiting();
  const [timeLeft, setTimeLeft] = useState(timeUntilReset);

  // Update countdown every second
  useEffect(() => {
    setTimeLeft(timeUntilReset);
    
    if (timeUntilReset > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1000));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timeUntilReset]);

  if (!tokenStatus) return null;
  if (isMobile) return null;

  const tokenPercentage = (currentTokens / TOKEN_LIMIT) * 100;
  const isNearLimit = currentTokens >= TOKEN_LIMIT * 0.8;

  if (!canChat && timeLeft > 0) {
    // Show timeout message
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <Clock className="h-4 w-4 text-destructive" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-destructive">
            DrKnowsIt is available in {formatTimeUntilReset(timeLeft)}
          </span>
          <span className="text-xs text-muted-foreground">
            Chat paused after {TOKEN_LIMIT} tokens
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
      <div className="flex items-center gap-2">
        <Zap className={`h-4 w-4 ${isNearLimit ? 'text-warning' : 'text-primary'}`} />
        <span className="text-sm font-medium">
          {currentTokens}/{TOKEN_LIMIT} tokens
        </span>
      </div>
      
      <div className="flex-1 min-w-20">
        <Progress 
          value={tokenPercentage} 
          className="h-2"
        />
      </div>

      <Badge variant={canChat ? "default" : "destructive"}>
        {canChat ? "Ready" : "Wait"}
      </Badge>
    </div>
  );
};