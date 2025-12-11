import { useMemo, useState } from 'react';
import { Check, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useLocation } from 'wouter';

type PlanId = 'free' | 'starter' | 'professional' | 'business';

const basePlans: Record<
  PlanId,
  {
    name: string;
    monthly: number;
    features: string[];
    description: string;
  }
> = {
  free: {
    name: 'Free',
    monthly: 0,
    description: '1 optimization per month to try us out',
    features: [
      '1 resume optimization/month',
      'Basic ATS score',
      'Standard PDF export (watermark)',
      'GPT-3.5 model',
    ],
  },
  starter: {
    name: 'Starter',
    monthly: 19,
    description: 'For active job seekers',
    features: [
      '5 optimizations/month',
      '3 cover letters',
      'Premium exports (no watermark)',
      'GPT-4o-mini model',
    ],
  },
  professional: {
    name: 'Professional',
    monthly: 49,
    description: 'Unlimited optimizations and pro features',
    features: [
      'Unlimited optimizations',
      'Unlimited cover letters',
      'Premium exports (PDF/DOCX/TXT)',
      'GPT-4o model',
      'Priority support',
    ],
  },
  business: {
    name: 'Business',
    monthly: 99,
    description: 'For teams and coaches',
    features: [
      'Everything in Professional',
      '5 team seats',
      'Team analytics',
      'Custom branding',
      'Dedicated success manager',
    ],
  },
};

const creditPacks = [
  { id: 'small' as const, name: '5 Credits', price: 7, credits: 5 },
  { id: 'medium' as const, name: '15 Credits', price: 19, credits: 15 },
  { id: 'large' as const, name: '50 Credits', price: 49, credits: 50 },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  const plans = useMemo(() => {
    return Object.entries(basePlans).map(([id, plan]) => {
      const price = annual ? plan.monthly * 12 * 0.8 : plan.monthly;
      return { ...plan, id: id as PlanId, displayPrice: price };
    });
  }, [annual]);

  const ensureAuthed = (): boolean => {
    if (!user) {
      navigate('/auth');
      return false;
    }
    return true;
  };

  const startSubscription = async (planId: PlanId) => {
    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }
    if (!ensureAuthed()) return;
    setLoading(planId);
    try {
      const { sessionUrl, url } = await api.createSubscriptionCheckout(
        planId,
        annual ? 'year' : 'month'
      );
      window.location.href = sessionUrl || url || '/pricing';
    } catch (error: any) {
      toast({
        title: 'Checkout failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const buyCredits = async (packId: 'small' | 'medium' | 'large') => {
    if (!ensureAuthed()) return;
    setLoading(packId);
    try {
      const { sessionUrl } = await api.createCreditCheckout(packId);
      window.location.href = sessionUrl;
    } catch (error: any) {
      toast({
        title: 'Purchase failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3 mb-8">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Free forever tier + 30-day guarantee on paid plans
        </p>
        <h1 className="text-4xl font-display font-bold">Pricing that scales with you</h1>
        <p className="text-muted-foreground">Upgrade when you see the value—no long contracts.</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <span className={!annual ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
        <Button variant="outline" size="sm" onClick={() => setAnnual((a) => !a)}>
          {annual ? 'Switch to Monthly' : 'Switch to Annual (save 20%)'}
        </Button>
        <span className={annual ? 'font-semibold' : 'text-muted-foreground'}>Annual</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-xl p-6 bg-card shadow-sm flex flex-col ${
              plan.id === 'professional' ? 'border-primary shadow-primary/10' : ''
            }`}
          >
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <div className="text-3xl font-bold">
                ${plan.displayPrice}
                <span className="text-sm text-muted-foreground">/{annual ? 'year' : 'month'}</span>
              </div>
              {plan.id === 'free' ? (
                <p className="text-xs text-muted-foreground">No card required.</p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    30-day money-back guarantee
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Cancel anytime
                  </div>
                </div>
              )}
            </div>
            <ul className="space-y-2 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6"
              onClick={() => startSubscription(plan.id)}
              disabled={loading === plan.id}
            >
              {loading === plan.id
                ? 'Redirecting...'
                : plan.id === 'free'
                  ? 'Get Started Free'
                  : 'Upgrade Now'}
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold text-center">Need more credits?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {creditPacks.map((pack) => (
            <div key={pack.id} className="border rounded-xl p-4 bg-card shadow-sm flex flex-col">
              <div className="text-lg font-semibold">{pack.name}</div>
              <div className="text-muted-foreground text-sm mb-2">{pack.credits} credits</div>
              <div className="text-2xl font-bold mb-4">${pack.price}</div>
              <Button onClick={() => buyCredits(pack.id)} disabled={loading === pack.id}>
                {loading === pack.id ? 'Redirecting...' : 'Buy credits'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
