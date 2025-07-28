import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown } from "lucide-react";

interface SubscriptionGateProps {
  children: ReactNode;
  requiredTier: 'basic' | 'pro';
  feature: string;
  description?: string;
}

export const SubscriptionGate = ({ 
  children, 
  requiredTier, 
  feature, 
  description 
}: SubscriptionGateProps) => {
  const { subscribed, subscription_tier, createCheckoutSession } = useSubscription();

  const hasAccess = () => {
    if (!subscribed) return false;
    
    if (requiredTier === 'basic') {
      return subscription_tier === 'basic' || subscription_tier === 'pro';
    }
    
    if (requiredTier === 'pro') {
      return subscription_tier === 'pro';
    }
    
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  const handleUpgrade = async () => {
    try {
      await createCheckoutSession(requiredTier);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    }
  };

  return (
    <Card className="relative overflow-hidden border-dashed border-2 border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      <CardHeader className="text-center relative">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {requiredTier === 'pro' ? <Crown className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
        </div>
        <CardTitle className="text-xl">
          {requiredTier === 'pro' ? 'Pro Feature' : 'Premium Feature'}
        </CardTitle>
        <p className="text-muted-foreground">
          {description || `${feature} requires a ${requiredTier === 'pro' ? 'Pro' : 'Basic'} subscription`}
        </p>
      </CardHeader>
      <CardContent className="text-center relative">
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to {requiredTier === 'pro' ? 'Pro' : 'Basic'} to unlock {feature.toLowerCase()} and other advanced features.
        </p>
        <Button 
          onClick={handleUpgrade}
          className="btn-primary w-full"
        >
          Upgrade to {requiredTier === 'pro' ? 'Pro ($50/month)' : 'Basic ($25/month)'}
        </Button>
      </CardContent>
    </Card>
  );
};