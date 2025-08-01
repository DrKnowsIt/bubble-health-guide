import { SubscriptionGate } from '@/components/SubscriptionGate';
import { AISettings } from '@/components/AISettings';

export const AISettingsWithGate = () => {
  return (
    <SubscriptionGate
      requiredTier="basic"
      feature="AI Settings"
      description="Customize AI behavior and personalization preferences with a Basic or Pro subscription."
    >
      <AISettings />
    </SubscriptionGate>
  );
};