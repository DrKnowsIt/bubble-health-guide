import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

interface TierStatusProps {
  showUpgradeButton?: boolean;
  className?: string;
}

export const TierStatus = ({ showUpgradeButton = true, className = "" }: TierStatusProps) => {
  const { subscribed, subscription_tier, loading, createCheckoutSession } = useSubscription();

  const handleUpgrade = async () => {
    try {
      // Always upgrade to Pro if they're not Pro
      const targetPlan = subscription_tier === 'pro' ? 'pro' : 'pro';
      await createCheckoutSession(targetPlan);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const isPro = subscribed && subscription_tier === 'pro';
  const isBasic = subscribed && subscription_tier === 'basic';
  const isUnsubscribed = !subscribed;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Badge 
        variant="secondary" 
        className={`
          flex items-center space-x-1
          ${isPro 
            ? 'bg-orange-100 text-orange-700 border-orange-200' 
            : isBasic
            ? 'bg-teal-100 text-teal-700 border-teal-200'
            : 'bg-red-100 text-red-700 border-red-200'
          }
        `}
      >
        {isPro ? (
          <>
            <Crown className="h-3 w-3" />
            <span>Pro</span>
          </>
        ) : isBasic ? (
          <>
            <Zap className="h-3 w-3" />
            <span>Basic</span>
          </>
        ) : (
          <>
            <Zap className="h-3 w-3" />
            <span>No Subscription</span>
          </>
        )}
      </Badge>
      
      {!isPro && showUpgradeButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleUpgrade}
          className="h-7 px-3 text-xs"
        >
          {isBasic ? 'Upgrade to Pro' : isUnsubscribed ? 'Subscribe Now' : 'Subscribe'}
        </Button>
      )}
    </div>
  );
};