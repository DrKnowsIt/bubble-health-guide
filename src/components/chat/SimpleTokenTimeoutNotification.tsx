import { useTokenTimeout } from '@/hooks/useTokenTimeout';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTimeUntilReset = (milliseconds: number): string => {
  const minutes = Math.ceil(milliseconds / (1000 * 60));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

export const SimpleTokenTimeoutNotification = () => {
  const { isInTimeout, timeUntilReset } = useTokenTimeout();

  if (!isInTimeout || timeUntilReset <= 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 mx-4 mb-2 rounded-lg",
      "bg-muted/50 border border-border",
    )}>
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
          <Clock className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          DrKnowsIt needs {formatTimeUntilReset(timeUntilReset)} to recharge. Your conversation is saved.
        </p>
      </div>
    </div>
  );
};