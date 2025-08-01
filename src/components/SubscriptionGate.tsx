import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanSelectionCard } from "@/components/PlanSelectionCard";

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
  const { subscribed, subscription_tier } = useSubscription();

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

  if (hasAccess()) {
    return <>{children}</>;
  }

  return (
    <PlanSelectionCard 
      description={description || `${feature} requires a subscription to access. Choose a plan that fits your needs:`}
    />
  );
};