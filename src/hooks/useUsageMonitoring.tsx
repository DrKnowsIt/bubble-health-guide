import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { checkRateLimit, getUserUsageStats, type DailyUsage } from '@/utils/usageTracking';
import { toast } from 'sonner';

interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  records: any[];
}

export const useUsageMonitoring = () => {
  const { user } = useAuth();
  const { subscription_tier, subscribed } = useSubscription();
  
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    messages_used: 0,
    tokens_used: 0,
    cost_incurred: 0,
    limit_reached: false
  });
  
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user can make another AI request
  const checkCanMakeRequest = useCallback(async (): Promise<boolean> => {
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
    }
    
    return allowed;
  }, [user?.id, subscription_tier]);

  // Load usage statistics
  const loadUsageStats = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const stats = await getUserUsageStats(user.id, 30);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    } finally {
      setLoading(false);
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
      loadUsageStats();
      refreshUsage();
    }
  }, [user?.id, loadUsageStats, refreshUsage]);

  // Warning when approaching limits
  useEffect(() => {
    if (dailyUsage.messages_used > 0) {
      const tier = subscription_tier || 'basic';
      const warningThresholds = { free: 8, basic: 80, pro: 400, enterprise: 800 };
      const threshold = warningThresholds[tier as keyof typeof warningThresholds] || 80;
      
      if (dailyUsage.messages_used >= threshold && dailyUsage.messages_used < (threshold + 5)) {
        toast.warning('Approaching daily limit', {
          description: `You've used ${dailyUsage.messages_used} of your daily messages.`,
          duration: 4000
        });
      }
    }
  }, [dailyUsage.messages_used, subscription_tier]);

  return {
    dailyUsage,
    usageStats,
    loading,
    checkCanMakeRequest,
    refreshUsage,
    loadUsageStats
  };
};