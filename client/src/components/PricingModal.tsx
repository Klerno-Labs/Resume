import { useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, CreditCard, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface PricingModalProps {
  trigger?: React.ReactNode;
  defaultPlan?: 'basic' | 'pro' | 'premium';
}

export function PricingModal({ trigger, defaultPlan = 'pro' }: PricingModalProps) {
  const [plan, setPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      const { url } = await api.createCheckout(plan);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const prices = {
    basic: 7,
    pro: 19,
    premium: 29,
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || <Button>Upgrade</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose your plan</DialogTitle>
          </DialogHeader>

          <RadioGroup value={plan} onValueChange={(v) => setPlan(v as 'basic' | 'premium' | 'pro')} className="grid gap-4">
            {/* Basic */}
            <Label
              htmlFor="basic"
              className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                plan === 'basic'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="basic" id="basic" className="mt-1" />
                <div>
                  <div className="font-bold">Basic</div>
                  <div className="text-sm text-muted-foreground mt-1">1 Resume optimization</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> AI-powered rewrite
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> ATS score analysis
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> PDF export
                    </li>
                  </ul>
                </div>
              </div>
              <div className="font-bold text-lg">$7</div>
            </Label>

            {/* Pro */}
            <Label
              htmlFor="pro"
              className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                plan === 'pro'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="pro" id="pro" className="mt-1" />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    Pro{' '}
                    <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">3 Resume optimizations</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Everything in Basic
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Keyword optimization
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Multiple versions
                    </li>
                  </ul>
                </div>
              </div>
              <div className="font-bold text-lg">$19</div>
            </Label>

            {/* Premium */}
            <Label
              htmlFor="premium"
              className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                plan === 'premium'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="premium" id="premium" className="mt-1" />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    Premium <Sparkles className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Unlimited optimizations</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Everything in Pro
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Cover letter AI
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Priority support
                    </li>
                  </ul>
                </div>
              </div>
              <div className="font-bold text-lg">$29</div>
            </Label>
          </RadioGroup>

          <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground">
            <div className="flex items-center gap-2 mb-2 font-medium text-foreground">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              30-Day Money-Back Guarantee
            </div>
            If you're not landing more interviews within 30 days, we'll refund your payment in full.
          </div>

          <Button onClick={() => void handleCheckout()} className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Continue to Payment - ${prices[plan]}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Secure checkout powered by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
