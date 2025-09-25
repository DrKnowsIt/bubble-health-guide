import { useEffect, useState } from 'react';
import { useTokenLimiting } from '@/hooks/useTokenLimiting';
import { formatTimeUntilReset, TOKEN_LIMIT } from '@/utils/tokenLimiting';
import { Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TokenTimeoutNotification = () => {
  const { tokenStatus, canChat, timeUntilReset } = useTokenLimiting();
  const [timeLeft, setTimeLeft] = useState(timeUntilReset);

  // Update countdown every minute
  useEffect(() => {
    setTimeLeft(timeUntilReset);
    
    if (timeUntilReset > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 60000); // Update every minute
          return newTime;
        });
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [timeUntilReset]);

  // Don't show if chat is available or no timeout
  if (canChat || !tokenStatus || timeLeft <= 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 mx-4 mb-4 rounded-lg",
      "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200",
      "dark:from-orange-950/20 dark:to-red-950/20 dark:border-orange-800/30"
    )}>
      <div className="flex-shrink-0 mt-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30">
          <Bot className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <h3 className="font-medium text-orange-900 dark:text-orange-100">
            🤖 DrKnowsIt is available to chat in {formatTimeUntilReset(timeLeft)}
          </h3>
        </div>
        
        <p className="text-sm text-orange-700 dark:text-orange-200 leading-relaxed">
          I've processed {TOKEN_LIMIT} tokens and need a 30-minute break to recharge. 
          This helps ensure I can provide quality responses for all users. 
          Your conversation will be saved and I'll be ready to continue soon!
        </p>
        
        <div className="mt-3 text-xs text-orange-600 dark:text-orange-300">
          💡 <strong>Tip:</strong> Use this time to review our previous conversation or explore your health insights in the sidebar.
        </div>
      </div>
    </div>
  );
};