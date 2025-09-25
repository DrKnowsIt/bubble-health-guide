import { useEffect, useState } from 'react';
import { useTokenLimiting } from '@/hooks/useTokenLimiting';
import { formatTimeUntilReset, TOKEN_LIMIT } from '@/utils/tokenLimiting';
import { Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TokenTimeoutNotification = () => {
  const { tokenStatus, canChat, timeUntilReset } = useTokenLimiting();

  // Don't show if chat is available or no timeout
  if (canChat || !tokenStatus || timeUntilReset <= 0) {
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