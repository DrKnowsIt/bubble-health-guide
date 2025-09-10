import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gem, Clock, Zap, TrendingUp } from 'lucide-react';
import { useGemStatus } from '@/hooks/useGemStatus';
import { formatTimeUntilReset, GEM_LIMITS } from '@/utils/gemTracking';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useEffect, useState } from 'react';

export const UsageMonitoringPanel = () => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  const { gemStatus, currentGems, maxGems, timeUntilReset, canChat } = useGemStatus();
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

  if (!user) return null;

  const gemPercentage = maxGems > 0 ? (currentGems / maxGems) * 100 : 0;
  const tier = subscription_tier || 'basic';
  const tierKey = tier.toLowerCase() as keyof typeof GEM_LIMITS;
  const tierLimit = GEM_LIMITS[tierKey] || GEM_LIMITS.basic;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Gem Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Gems</CardTitle>
            <Gem className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentGems}</div>
            <p className="text-xs text-muted-foreground">
              of {maxGems} gems available
            </p>
            <div className="mt-3">
              <Progress value={gemPercentage} className="h-2" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant={canChat ? "default" : "destructive"}>
                {canChat ? "Ready to chat" : "No gems"}
              </Badge>
              {!canChat && timeLeft > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeUntilReset(timeLeft)} until refill</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Reset */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Refill</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeLeft > 0 ? formatTimeUntilReset(timeLeft) : 'Ready'}
            </div>
            <p className="text-xs text-muted-foreground">
              Gems refill every 3 hours
            </p>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Full refill to {maxGems} gems
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Subscription Benefits
          </CardTitle>
          <CardDescription>
            Your current plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Gems per cycle (3 hours)</span>
              <Badge variant="secondary">{tierLimit} gems</Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div className="space-y-1">
                <div>• 1 gem ≈ 1000 AI tokens</div>
                <div>• Simple questions: 1-2 gems</div>
                <div>• Complex analysis: 3-5 gems</div>
                <div>• Image analysis: 2-4 gems</div>
              </div>
            </div>

            {tier === 'basic' && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="text-sm">
                  <strong>💎 Upgrade to Pro</strong>
                  <div className="text-muted-foreground mt-1">
                    Get 200 gems every 3 hours (4x more than Basic)
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};