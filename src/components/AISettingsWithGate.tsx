import { SubscriptionGate } from '@/components/SubscriptionGate';
import { AISettings } from '@/components/AISettings';

export const AISettingsWithGate = () => {
  return (
    <SubscriptionGate
      requiredTier="pro"
      feature="AI Settings"
      description="Customize AI behavior, memory settings, and personalization preferences to enhance your health conversations."
    >
      <AISettings />
    </SubscriptionGate>
  );
};