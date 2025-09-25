import { useSimpleTokenTimeout } from '@/hooks/useSimpleTokenTimeout';
import { Clock, RefreshCw, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Force HMR refresh

const formatTimeUntilReset = (milliseconds: number): string => {
  const minutes = Math.ceil(milliseconds / (1000 * 60));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

export const SimpleTokenTimeoutNotification = () => {
  const { isInTimeout, timeUntilReset, clearTimeout } = useSimpleTokenTimeout();

  console.log('🔍 [SimpleTokenTimeoutNotification] Render:', { isInTimeout, timeUntilReset });

  if (!isInTimeout || timeUntilReset <= 0) {
    return null;
  }

  const handleForceRefresh = () => {
    console.log('🔄 [DEBUG] Forcing timeout refresh');
    window.location.reload();
  };

  const handleClearTimeout = () => {
    console.log('🧪 [DEBUG] Clearing timeout manually');
    clearTimeout();
  };

  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 mx-4 mb-4 rounded-lg",
      "bg-amber-50 border-2 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800">
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-200" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            DrKnowsIt needs {formatTimeUntilReset(timeUntilReset)} to recharge
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Your conversation is saved and will continue automatically when ready.
          </p>
        </div>
      </div>
      
      {/* Debug controls in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="flex gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleClearTimeout}
            className="text-xs"
          >
            <Bug className="w-3 h-3 mr-1" />
            Clear Timeout
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleForceRefresh}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Force Refresh
          </Button>
        </div>
      )}
    </div>
  );
};