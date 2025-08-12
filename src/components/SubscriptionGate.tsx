import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanSelectionCard } from "@/components/PlanSelectionCard";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { subscribed, subscription_tier, loading } = useSubscription();

  const hasAccess = () => {
    // No access without subscription
    if (!subscribed || !subscription_tier) return false;
    
    if (requiredTier === 'basic') {
      return subscription_tier === 'basic' || subscription_tier === 'pro';
    }
    
    if (requiredTier === 'pro') {
      return subscription_tier === 'pro';
    }
    
    return false;
  };

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (hasAccess()) {
    return <>{children}</>;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <PlanSelectionCard 
        description={description || `${feature} requires a subscription to access. Choose a plan that fits your needs:`}
      />
    </div>
  );
};