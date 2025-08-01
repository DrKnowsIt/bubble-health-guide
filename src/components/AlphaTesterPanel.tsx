import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const AlphaTesterPanel = () => {
  const { user } = useAuth();
  const { subscription_tier, subscribed, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTierSwitch = async () => {
    if (!selectedTier || !user?.email) return;

    setLoading(true);
    try {
      const tierConfig = {
        unpaid: { subscribed: false, tier: null, end: null },
        basic: { 
          subscribed: true, 
          tier: 'Basic',
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        pro: { 
          subscribed: true, 
          tier: 'Pro',
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }
      };

      const config = tierConfig[selectedTier as keyof typeof tierConfig];
      
      // Use the service role to update subscription status directly
      const { error } = await supabase.functions.invoke('alpha-tier-switch', {
        body: { 
          email: user.email,
          subscribed: config.subscribed,
          subscription_tier: config.tier,
          subscription_end: config.end
        }
      });

      if (error) {
        throw error;
      }

      // Refresh subscription status
      await refreshSubscription();
      
      toast({
        title: "Tier switched successfully",
        description: `Switched to ${selectedTier} tier`,
      });
    } catch (error) {
      console.error('Error switching tier:', error);
      toast({
        title: "Error switching tier",
        description: "Failed to switch subscription tier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTierDisplay = () => {
    if (!subscribed) return 'Unpaid';
    return subscription_tier || 'Unknown';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Alpha Tester Panel 
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Alpha
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Current Tier:</p>
          <Badge variant="outline" className="font-medium">
            {getCurrentTierDisplay()}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Switch to Tier:</label>
          <Select value={selectedTier} onValueChange={setSelectedTier}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tier to switch to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleTierSwitch} 
          disabled={!selectedTier || loading}
          className="w-full"
        >
          {loading ? 'Switching...' : 'Switch Tier'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          This panel is only visible to alpha testers and allows you to test different subscription tiers.
        </p>
      </CardContent>
    </Card>
  );
};