import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: 'basic' | 'pro' | null;
  subscription_end: string | null;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionInfo {
  checkSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (plan?: 'basic' | 'pro') => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const normalizeTier = (tier?: string | null): 'basic' | 'pro' | null => {
  if (!tier) return null;
  const t = tier.toLowerCase();
  if (t.includes('basic')) return 'basic';
  // Treat premium/enterprise/pro as "pro"
  if (t.includes('pro') || t.includes('premium') || t.includes('enterprise')) return 'pro';
  return null;
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionInfo>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, subscription_tier: null, subscription_end: null, loading: false });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        console.error('Error checking subscription:', error);
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const normalizedTier = normalizeTier(data?.subscription_tier);
      const subscribed = Boolean(data?.subscribed);
      const subscription_end = data?.subscription_end ?? null;

      console.log('Subscription data received (normalized):', {
        subscribed,
        subscription_tier: normalizedTier,
        subscription_end,
      });

      // Check if subscription tier changed (potential downgrade)
      const oldTier = state.subscription_tier;
      if (oldTier && normalizedTier && oldTier !== normalizedTier && oldTier === 'pro' && normalizedTier === 'basic') {
        console.log('Subscription downgrade detected, running cleanup...');
        try {
          await supabase.functions.invoke('subscription-downgrade-cleanup', {
            body: {
              user_id: user.id,
              from_tier: oldTier,
              to_tier: normalizedTier
            }
          });
          console.log('Subscription cleanup completed');
        } catch (cleanupError) {
          console.error('Error in subscription cleanup:', cleanupError);
          // Don't fail the subscription check if cleanup fails
        }
      }

      setState({
        subscribed,
        subscription_tier: normalizedTier,
        subscription_end,
        loading: false,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user, state.subscription_tier]);

  const createCheckoutSession = useCallback(async (plan: 'basic' | 'pro' = 'pro') => {
    if (!user) throw new Error('User must be authenticated');
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan } });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    } finally {
      // Best-effort refresh
      setTimeout(() => {
        checkSubscription();
      }, 1000);
    }
  }, [user, checkSubscription]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) throw new Error('User must be authenticated');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    } finally {
      // Refresh after action
      setTimeout(() => {
        checkSubscription();
      }, 1000);
    }
  }, [user, checkSubscription]);

  useEffect(() => {
    // Re-check whenever auth user changes
    checkSubscription();
  }, [checkSubscription]);

  const value = useMemo<SubscriptionContextType>(() => ({
    ...state,
    checkSubscription,
    refreshSubscription: checkSubscription,
    createCheckoutSession,
    openCustomerPortal,
  }), [state, checkSubscription, createCheckoutSession, openCustomerPortal]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
};
