import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { checkRateLimit, getUserUsageStats, type DailyUsage } from '@/utils/usageTracking';
import { toast } from 'sonner';

interface TokenUsageStats {
  dailyUsage: DailyUsage;
  usageStats: any;
  loading: boolean;
  tokenWarningThreshold: number;
  isApproachingLimit: boolean;
  canMakeRequest: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

export const useTokenUsageOptimization = (): TokenUsageStats => {
  const { user } = useAuth();
  const { subscription_tier, subscribed } = useSubscription();
  
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    messages_used: 0,
    tokens_used: 0,
    cost_incurred: 0,
    limit_reached: false
  });
  
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic warning thresholds based on subscription tier
  const getWarningThreshold = useCallback(() => {
    const tier = subscription_tier || 'basic';
    const thresholds = { 
      free: 8, 
      basic: 80, 
      pro: 400, 
      enterprise: 800 
    };
    return thresholds[tier as keyof typeof thresholds] || 80;
  }, [subscription_tier]);

  const tokenWarningThreshold = getWarningThreshold();
  const isApproachingLimit = dailyUsage.messages_used >= tokenWarningThreshold * 0.8;

  // Check if user can make another request
  const canMakeRequest = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    
    const tier = subscription_tier || 'basic';
    const { allowed, usage } = await checkRateLimit(user.id, tier);
    
    setDailyUsage(usage);
    
    if (!allowed) {
      const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
      toast.error(`Daily message limit reached for ${tierName} tier`, {
        description: `You've used ${usage.messages_used} messages today. Upgrade to increase your limit.`,
        duration: 5000
      });
      return false;
    }
    
    // Warning for approaching limit
    if (usage.messages_used >= tokenWarningThreshold * 0.9 && usage.messages_used < tokenWarningThreshold) {
      toast.warning('Approaching daily limit', {
        description: `You have ${Math.max(0, tokenWarningThreshold - usage.messages_used)} messages remaining today.`,
        duration: 4000
      });
    }
    
    return true;
  }, [user?.id, subscription_tier, tokenWarningThreshold]);

  // Load usage statistics
  const loadUsageStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const stats = await getUserUsageStats(user.id, 30);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  }, [user?.id]);

  // Refresh current usage
  const refreshUsage = useCallback(async () => {
    if (!user?.id) return;
    
    const tier = subscription_tier || 'basic';
    const { usage } = await checkRateLimit(user.id, tier);
    setDailyUsage(usage);
  }, [user?.id, subscription_tier]);

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      Promise.all([loadUsageStats(), refreshUsage()])
        .finally(() => setLoading(false));
    }
  }, [user?.id, loadUsageStats, refreshUsage]);

  return {
    dailyUsage,
    usageStats,
    loading,
    tokenWarningThreshold,
    isApproachingLimit,
    canMakeRequest,
    refreshUsage
  };
};