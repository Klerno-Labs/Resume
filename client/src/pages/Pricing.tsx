import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { Check, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    id: "free",
    name: "Free Forever",
    amount: 0,
    interval: "month",
    description: "Try Resume Repairer with 1 optimization/month",
    features: [
      "1 resume optimization per month",
      "Basic ATS score",
      "Standard PDF export (watermark)",
      "GPT-3.5 model",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    amount: 1900,
    interval: "month",
    description: "For active job seekers",
    features: [
      "5 resume optimizations / month",
      "3 cover letter generations",
      "Full ATS report",
      "Premium PDF export (no watermark)",
      "GPT-4o-mini model",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    amount: 4900,
    interval: "month",
    description: "Unlimited optimizations and pro features",
    mostPopular: true,
    features: [
      "Unlimited optimizations & cover letters",
      "Premium exports (PDF/DOCX/TXT)",
      "GPT-4o model",
      "Priority support",
      "Custom templates & LinkedIn optimization",
    ],
  },
  {
    id: "business",
    name: "Business",
    amount: 9900,
    interval: "month",
    description: "For teams and coaches",
    features: [
      "Everything in Professional",
      "5 team seats",
      "Team analytics",
      "Custom branding & API access",
      "Dedicated success manager",
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const startCheckout = async (planId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (planId === "free") {
      navigate("/dashboard");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { url } = await api.createSubscriptionCheckout(planId);
      if (url) {
        window.location.href = url;
      } else {
        toast({
          title: "Checkout created",
          description: "Unable to open Stripe automatically. Please try again.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center space-y-3 mb-8">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          No free trials. Upgrade when you see the value.
        </p>
        <h1 className="text-4xl font-display font-bold">Plans built to protect your budget</h1>
        <p className="text-muted-foreground">Free forever tier + 30-day money-back guarantee.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`border rounded-xl p-6 bg-card shadow-sm flex flex-col ${
              tier.mostPopular ? "border-primary shadow-primary/10" : ""
            }`}
          >
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">{tier.description}</p>
              <div className="text-3xl font-bold">
                ${tier.amount / 100}
                <span className="text-sm text-muted-foreground">/{tier.interval}</span>
              </div>
              {tier.id === "free" ? (
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
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {feature}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6"
              onClick={() => startCheckout(tier.id)}
              disabled={loadingPlan === tier.id}
            >
              {loadingPlan === tier.id
                ? "Redirecting..."
                : tier.id === "free"
                  ? "Get Started Free"
                  : "Upgrade Now"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
