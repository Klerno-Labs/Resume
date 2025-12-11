import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';

interface UpgradePromptProps {
  planId: string;
  headline?: string;
  description?: string;
  ctaLabel?: string;
}

export function UpgradePrompt({
  planId,
  headline = 'Upgrade for more credits',
  description = 'Unlock more resumes, cover letters, and ATS insights with a paid plan.',
  ctaLabel = 'Upgrade now',
}: UpgradePromptProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(true);
    try {
      const { url } = await api.createSubscriptionCheckout(planId);
      if (url) {
        window.location.href = url;
      } else {
        toast({
          title: 'Checkout created',
          description: 'We could not open Stripe automatically. Please try again.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upgrade failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">{headline}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? 'Redirecting...' : ctaLabel}
      </Button>
    </div>
  );
}
