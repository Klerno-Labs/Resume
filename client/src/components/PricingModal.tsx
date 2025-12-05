import { useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface PricingModalProps {
  trigger?: React.ReactNode;
  defaultPlan?: "basic" | "pro" | "premium";
}

export function PricingModal({ trigger, defaultPlan = "pro" }: PricingModalProps) {
  const [plan, setPlan] = useState(defaultPlan);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock payment delay
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated!",
      });
    }, 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button>Upgrade</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden gap-0">
        <div className="grid md:grid-cols-5 h-full">
          {/* Left: Plan Selection */}
          <div className="md:col-span-3 p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Select your plan</DialogTitle>
            </DialogHeader>

            <RadioGroup value={plan} onValueChange={(v: any) => setPlan(v)} className="grid gap-4">
              {/* Basic */}
              <Label
                htmlFor="basic"
                className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                  plan === "basic" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="basic" id="basic" className="mt-1" />
                  <div>
                    <div className="font-bold">Basic</div>
                    <div className="text-sm text-muted-foreground mt-1">1 Resume • PDF Export</div>
                  </div>
                </div>
                <div className="font-bold text-lg">$7</div>
              </Label>

              {/* Pro */}
              <Label
                htmlFor="pro"
                className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                  plan === "pro" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="pro" id="pro" className="mt-1" />
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      Pro <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">POPULAR</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">3 Resumes • ATS Report • Keywords</div>
                  </div>
                </div>
                <div className="font-bold text-lg">$19</div>
              </Label>

              {/* Premium */}
              <Label
                htmlFor="premium"
                className={`flex items-start justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                  plan === "premium" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="premium" id="premium" className="mt-1" />
                  <div>
                    <div className="font-bold">Premium</div>
                    <div className="text-sm text-muted-foreground mt-1">Unlimited • Cover Letter AI • LinkedIn</div>
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
              If you're not landing more interviews within 30 days, we'll refund your payment in full. No questions asked.
            </div>
          </div>

          {/* Right: Payment Form */}
          <div className="md:col-span-2 bg-secondary/30 border-l p-6 flex flex-col">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Details
            </h3>

            <form onSubmit={handlePayment} className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label>Cardholder Name</Label>
                <Input placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="0000 0000 0000 0000" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" required />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input placeholder="123" required />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Total</span>
                <span>${plan === "basic" ? "7" : plan === "pro" ? "19" : "29"}.00</span>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Pay Securely
              </Button>
            </form>
            
            <div className="mt-4 flex justify-center gap-2 opacity-50">
               {/* Card Icons */}
               <div className="w-8 h-5 bg-slate-300 rounded"></div>
               <div className="w-8 h-5 bg-slate-300 rounded"></div>
               <div className="w-8 h-5 bg-slate-300 rounded"></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
