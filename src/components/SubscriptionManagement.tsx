import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Calendar, CreditCard, Settings, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const SubscriptionManagement = () => {
  const { subscribed, subscription_tier, subscription_end, loading, openCustomerPortal } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanChange = async (planType: 'basic' | 'pro') => {
    setIsLoading(true);
    try {
      // Always open customer portal for all subscription actions
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatSubscriptionEnd = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCurrentPlanDisplay = () => {
    if (!subscribed || !subscription_tier) {
      return {
        name: "No Active Subscription",
        icon: Zap,
        variant: "secondary" as const,
        description: "You're currently using the free tier with limited features."
      };
    }

    if (subscription_tier === 'basic') {
      return {
        name: "Basic Plan",
        icon: Zap,
        variant: "outline" as const,
        description: "Essential AI health guidance with core features."
      };
    }

    if (subscription_tier === 'pro') {
      return {
        name: "Pro Plan",
        icon: Crown,
        variant: "default" as const,
        description: "Complete AI health guidance with all features unlocked."
      };
    }

    return {
      name: "Unknown Plan",
      icon: Zap,
      variant: "secondary" as const,
      description: "Please contact support for assistance."
    };
  };

  const currentPlan = getCurrentPlanDisplay();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <currentPlan.icon className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={currentPlan.variant} className="mb-2">
                {currentPlan.name}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {currentPlan.description}
              </p>
              {subscription_end && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Next billing: {formatSubscriptionEnd(subscription_end)}</span>
                </div>
              )}
            </div>
            {subscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Plan */}
        <Card className={`medical-card transition-all hover:scale-[1.02] ${subscription_tier === 'basic' ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted-dark text-white">
                <Zap className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-xl">Basic Plan</CardTitle>
            <div className="text-3xl font-bold text-foreground">
              $25<span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
            <p className="text-muted-foreground text-sm">Essential AI health guidance</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Answer basic health questions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Manage 1 user
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                4 essential health forms
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Basic conversation history
              </li>
            </ul>
            <Button
              variant={subscription_tier === 'basic' ? 'secondary' : 'outline'}
              className="w-full"
              disabled={subscription_tier === 'basic' || isLoading}
              onClick={() => handlePlanChange('basic')}
            >
              {subscription_tier === 'basic' ? 'Current Plan' : subscribed ? 'Downgrade' : 'Choose Basic'}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={`medical-card transition-all hover:scale-[1.02] relative ${subscription_tier === 'pro' ? 'ring-2 ring-primary' : ''}`}>
          <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
            Most Popular
          </div>
          <CardHeader className="text-center pt-12">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bubble text-white">
                <Crown className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-xl">Pro Plan</CardTitle>
            <div className="text-3xl font-bold text-foreground">
              $50<span className="text-lg font-normal text-muted-foreground">/month</span>
            </div>
            <p className="text-muted-foreground text-sm">Complete AI health guidance</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Unlimited health questions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Manage up to 10 users
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                All 11 comprehensive health forms
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Advanced medical reasoning
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Health records management
              </li>
            </ul>
            <Button
              variant={subscription_tier === 'pro' ? 'secondary' : 'default'}
              className={`w-full ${subscription_tier !== 'pro' ? 'btn-primary' : ''}`}
              disabled={subscription_tier === 'pro' || isLoading}
              onClick={handleManageSubscription}
            >
              {subscription_tier === 'pro' ? 'Current Plan' : 'Manage in Stripe'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Billing Management */}
      {subscribed && (
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              Billing & Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Manage your payment methods, view billing history, and update your subscription preferences.
            </p>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isLoading}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};