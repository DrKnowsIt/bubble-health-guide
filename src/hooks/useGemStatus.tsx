import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { getGemStatus, initializeUserGems, type GemStatus } from '@/utils/gemTracking';
import { toast } from 'sonner';

export const useGemStatus = () => {
  const { user } = useAuth();
  const { subscription_tier } = useSubscription();
  
  const [gemStatus, setGemStatus] = useState<GemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshGemStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const status = await getGemStatus(user.id);
      setGemStatus(status);
      
      // Show warning when gems are low
      if (status && status.current_gems <= 5 && status.current_gems > 0) {
        toast.warning(`💎 Only ${status.current_gems} gems remaining!`, {
          description: 'Your gems will refill in the next reset cycle.',
        });
      }
    } catch (error) {
      console.error('Error refreshing gem status:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initialize gems for new users
  useEffect(() => {
    if (user?.id && subscription_tier) {
      initializeUserGems(user.id, subscription_tier);
    }
  }, [user?.id, subscription_tier]);

  // Load gem status
  useEffect(() => {
    if (user?.id) {
      refreshGemStatus();
    }
  }, [user?.id, refreshGemStatus]);

  // Auto-refresh gem status every minute to check for resets
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      refreshGemStatus();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [user?.id, refreshGemStatus]);

  // Show toast when gems are exhausted
  useEffect(() => {
    if (gemStatus && gemStatus.current_gems === 0) {
      const timeLeft = gemStatus.time_until_reset || 0;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      toast.error('💎 No gems remaining!', {
        description: `Wait ${hours}h ${minutes}m for your gems to refill.`,
        duration: 5000,
      });
    }
  }, [gemStatus?.current_gems]);

  return {
    gemStatus,
    loading,
    refreshGemStatus,
    canChat: gemStatus?.can_chat ?? false,
    currentGems: gemStatus?.current_gems ?? 0,
    maxGems: gemStatus?.max_gems ?? 0,
    timeUntilReset: gemStatus?.time_until_reset ?? 0,
  };
};