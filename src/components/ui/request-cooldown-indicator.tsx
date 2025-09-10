import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Send, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestCooldownIndicatorProps {
  isInCooldown: boolean;
  isBlocked: boolean;
  remainingCooldownMs: number;
  blockTimeRemainingMs: number;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function RequestCooldownIndicator({
  isInCooldown,
  isBlocked,
  remainingCooldownMs,
  blockTimeRemainingMs,
  className,
  children,
  onClick,
  disabled = false
}: RequestCooldownIndicatorProps) {
  const [displayTime, setDisplayTime] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isInCooldown && !isBlocked) {
      setDisplayTime(0);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const timeRemaining = isBlocked ? blockTimeRemainingMs : remainingCooldownMs;
      const totalTime = isBlocked ? 15 * 60 * 1000 : 3000; // 15 min or 3 sec
      
      setDisplayTime(Math.max(0, timeRemaining));
      setProgress(Math.max(0, 100 - (timeRemaining / totalTime) * 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isInCooldown, isBlocked, remainingCooldownMs, blockTimeRemainingMs]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return '0s';
    if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.ceil((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const isDisabled = disabled || isInCooldown || isBlocked;

  if (isBlocked) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          onClick={onClick}
          disabled={true}
          className="w-full"
          variant="destructive"
        >
          <Shield className="h-4 w-4 mr-2" />
          Too Many Failures - Blocked
        </Button>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Unblocked in: {formatTime(displayTime)}</span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Circuit Breaker
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>
    );
  }

  if (isInCooldown) {
    return (
      <div className={cn('space-y-2', className)}>
        <Button
          onClick={onClick}
          disabled={true}
          className="w-full"
          variant="secondary"
        >
          <Clock className="h-4 w-4 mr-2" />
          Please wait... ({formatTime(displayTime)})
        </Button>
        <Progress value={progress} className="h-1" />
      </div>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      className={cn('w-full', className)}
    >
      {children || (
        <>
          <Send className="h-4 w-4 mr-2" />
          Send Message
        </>
      )}
    </Button>
  );
}