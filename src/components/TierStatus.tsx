import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Loader2, Settings, ChevronDown, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { useAlphaTester } from '@/hooks/useAlphaTester';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TierStatusProps {
  showUpgradeButton?: boolean;
  className?: string;
}

export const TierStatus = ({ showUpgradeButton = true, className = "" }: TierStatusProps) => {
  const { subscribed, subscription_tier, loading, createCheckoutSession, openCustomerPortal, refreshSubscription } = useSubscription();
  const { isAlphaTester, loading: alphaTesterLoading } = useAlphaTester();

  const handleUpgrade = async () => {
    try {
      if (subscribed) {
        await openCustomerPortal();
      } else {
        await createCheckoutSession('pro');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTierSwitch = async (tier: 'free' | 'basic' | 'pro') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        throw new Error('User email not found');
      }

      const { error } = await supabase.functions.invoke('alpha-tier-switch', {
        body: {
          email: userData.user.email,
          subscribed: tier !== 'free',
          subscription_tier: tier === 'free' ? null : tier,
          subscription_end: tier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        }
      });

      if (error) {
        throw error;
      }

      await refreshSubscription();
      
      toast({
        title: "Tier Updated",
        description: `Successfully switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`,
      });
    } catch (error) {
      console.error('Error switching tier:', error);
      toast({
        title: "Error",
        description: "Failed to switch tier. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || alphaTesterLoading) {
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
    <div className={`flex items-center ${className}`}>
      {/* Enhanced Interactive Tier Badge with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`
              flex items-center space-x-2 h-8 px-3 rounded-full transition-all hover:scale-105
              ${isPro 
                ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 hover:from-orange-200 hover:to-orange-300 border border-orange-300' 
                : isBasic
                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300 border border-blue-300'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 border border-gray-300'
              }
            `}
          >
            {isPro ? (
              <>
                <Crown className="h-3 w-3" />
                <span className="font-medium">{isAlphaTester ? 'Pro: Tester' : 'Pro'}</span>
                {isAlphaTester && <Edit className="h-3 w-3 opacity-70" />}
              </>
            ) : isBasic ? (
              <>
                <Zap className="h-3 w-3" />
                <span className="font-medium">{isAlphaTester ? 'Basic: Tester' : 'Basic'}</span>
                {isAlphaTester && <Edit className="h-3 w-3 opacity-70" />}
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                <span className="font-medium">{isAlphaTester ? 'Free: Tester' : 'Free'}</span>
                {isAlphaTester && <Edit className="h-3 w-3 opacity-70" />}
              </>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">
              {isPro ? 'Pro Plan' : isBasic ? 'Basic Plan' : 'Free Tier'}
              {isAlphaTester && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  TESTER
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPro ? 'All features unlocked' : isBasic ? 'Essential features' : 'Limited features'}
              {isAlphaTester && ' (Test Mode)'}
            </p>
          </div>
          
          {isAlphaTester ? (
            <>
              <div className="p-2 pb-0">
                <p className="text-xs font-medium text-muted-foreground">Switch Test Tier</p>
              </div>
              <DropdownMenuItem 
                onClick={() => handleTierSwitch('free')} 
                className="cursor-pointer"
                disabled={isUnsubscribed}
              >
                <Zap className="h-4 w-4 mr-2" />
                Free Tier
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleTierSwitch('basic')} 
                className="cursor-pointer"
                disabled={isBasic}
              >
                <Zap className="h-4 w-4 mr-2" />
                Basic Plan
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleTierSwitch('pro')} 
                className="cursor-pointer"
                disabled={isPro}
              >
                <Crown className="h-4 w-4 mr-2" />
                Pro Plan
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={handleManageSubscription} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Manage Subscription
              </DropdownMenuItem>
              
              {!isPro && (
                <DropdownMenuItem onClick={handleUpgrade} className="cursor-pointer">
                  <Crown className="h-4 w-4 mr-2" />
                  {isBasic ? 'Upgrade to Pro' : 'Subscribe to Pro'}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};