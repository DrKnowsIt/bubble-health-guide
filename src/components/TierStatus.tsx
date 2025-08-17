import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Loader2, Settings, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface TierStatusProps {
  showUpgradeButton?: boolean;
  className?: string;
}

export const TierStatus = ({ showUpgradeButton = true, className = "" }: TierStatusProps) => {
  const { subscribed, subscription_tier, loading, createCheckoutSession, openCustomerPortal } = useSubscription();

  const handleUpgrade = async () => {
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
                <span className="font-medium">Pro</span>
              </>
            ) : isBasic ? (
              <>
                <Zap className="h-3 w-3" />
                <span className="font-medium">Basic</span>
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                <span className="font-medium">Free</span>
              </>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">
              {isPro ? 'Pro Plan' : isBasic ? 'Basic Plan' : 'Free Tier'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPro ? 'All features unlocked' : isBasic ? 'Essential features' : 'Limited features'}
            </p>
          </div>
          
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/pricing" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Subscription
            </Link>
          </DropdownMenuItem>
          
          {!isPro && (
            <DropdownMenuItem onClick={handleUpgrade} className="cursor-pointer">
              <Crown className="h-4 w-4 mr-2" />
              Manage Subscription
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={handleUpgrade} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            Manage Subscription
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Upgrade Button - Only for non-Pro users */}
      {!isPro && showUpgradeButton && (
        <Button
          size="sm"
          variant="default"
          onClick={handleUpgrade}
          className="ml-2 h-7 px-3 text-xs btn-primary"
        >
          Manage Plan
        </Button>
      )}
    </div>
  );
};