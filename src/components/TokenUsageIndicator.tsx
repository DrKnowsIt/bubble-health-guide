import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Clock } from 'lucide-react';
import { useSimpleTokenTimeout } from '@/hooks/useSimpleTokenTimeout';
import { formatTimeUntilReset } from '@/utils/tokenLimiting';

export const TokenUsageIndicator: React.FC = () => {
  const { isInTimeout, timeUntilReset } = useSimpleTokenTimeout();

  // Only show when in timeout
  if (!isInTimeout || timeUntilReset <= 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Token Recharge</span>
        </div>
        
        <div className="mt-2 text-sm text-amber-700">
          Chat will be available in <strong>{formatTimeUntilReset(timeUntilReset)}</strong>
        </div>
      </CardContent>
    </Card>
  );
};