import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, MessageCircle, Zap, DollarSign } from 'lucide-react';
import { useUsageMonitoring } from '@/hooks/useUsageMonitoring';
import { useSubscription } from '@/hooks/useSubscription';
import { RATE_LIMITS } from '@/utils/usageTracking';

export const UsageMonitoringPanel = () => {
  const { dailyUsage, usageStats, loading, refreshUsage } = useUsageMonitoring();
  const { subscription_tier, subscribed } = useSubscription();
  
  const tier = subscription_tier || 'basic';
  const tierKey = tier.toLowerCase() as keyof typeof RATE_LIMITS;
  const dailyLimit = RATE_LIMITS[tierKey] || RATE_LIMITS.basic;
  const usagePercentage = (dailyUsage.messages_used / dailyLimit) * 100;

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Usage Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Track your AI usage and costs across all features
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshUsage}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Daily Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Daily Usage
            <Badge variant={dailyUsage.limit_reached ? 'destructive' : 'secondary'}>
              {tier.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Messages used today ({dailyUsage.messages_used} of {dailyLimit})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress 
              value={usagePercentage} 
              className={`h-3 ${usagePercentage >= 90 ? 'bg-destructive/20' : ''}`}
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium">{formatNumber(dailyUsage.tokens_used)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">{formatCurrency(dailyUsage.cost_incurred)}</span>
              </div>
            </div>
            {dailyUsage.limit_reached && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  Daily limit reached! Upgrade your plan to continue using AI features.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            30-Day Statistics
          </CardTitle>
          <CardDescription>
            Your usage patterns over the past month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : usageStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(usageStats.totalMessages)}
                </div>
                <div className="text-sm text-muted-foreground">Messages</div>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(usageStats.totalTokens)}
                </div>
                <div className="text-sm text-muted-foreground">Tokens</div>
              </div>
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(usageStats.totalCost)}
                </div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No usage data available</p>
          )}
        </CardContent>
      </Card>

      {/* Tier Limits Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Basic:</span>
              <span>{RATE_LIMITS.basic} messages/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pro:</span>
              <span>{RATE_LIMITS.pro} messages/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enterprise:</span>
              <span>{RATE_LIMITS.enterprise} messages/day</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};