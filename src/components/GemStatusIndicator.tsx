import { useEffect, useState } from 'react';
import { useGemStatus } from '@/hooks/useGemStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatTimeUntilReset } from '@/utils/gemTracking';
import { Clock, Gem } from 'lucide-react';

export const GemStatusIndicator = () => {
  const isMobile = useIsMobile();
  const { gemStatus, canChat, currentGems, maxGems, timeUntilReset } = useGemStatus();
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

  if (!gemStatus) return null;
  if (isMobile) return null;

  const gemPercentage = maxGems > 0 ? (currentGems / maxGems) * 100 : 0;
  const isLow = currentGems <= 10;
  const isEmpty = currentGems === 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
      <div className="flex items-center gap-2">
        <Gem className={`h-4 w-4 ${isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-primary'}`} />
        <span className="text-sm font-medium">
          {currentGems}/{maxGems} gems
        </span>
      </div>
      
      <div className="flex-1 min-w-20">
        <Progress 
          value={gemPercentage} 
          className="h-2"
        />
      </div>

      {isEmpty && timeLeft > 0 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeUntilReset(timeLeft)}</span>
        </div>
      )}

      <Badge variant={canChat ? "default" : "destructive"}>
        {canChat ? "Ready" : "Wait"}
      </Badge>
    </div>
  );
};