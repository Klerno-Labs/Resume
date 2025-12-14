import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Trigger } from '@/components/UpgradeModal';

export function useUpgradePrompt() {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<Trigger>('limit_reached');
  const [featureName, setFeatureName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!showUpgrade) return;
    // Track prompt display
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'upgrade_prompt_shown',
        properties: { trigger: upgradeTrigger, feature: featureName },
      }),
    });
  }, [showUpgrade, upgradeTrigger, featureName]);

  const triggerUpgrade = (trigger: Trigger, feature?: string) => {
    if (user?.plan && user.plan !== 'free') return;
    setUpgradeTrigger(trigger);
    setFeatureName(feature);
    setShowUpgrade(true);
  };

  return {
    showUpgrade,
    upgradeTrigger,
    featureName,
    triggerUpgrade,
    closeUpgrade: () => setShowUpgrade(false),
  };
}
