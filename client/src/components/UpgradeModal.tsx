import { Crown, TrendingUp, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Trigger = "limit_reached" | "premium_feature" | "watermark_notice";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: Trigger;
  featureName?: string;
}

export function UpgradeModal({ isOpen, onClose, trigger, featureName }: UpgradeModalProps) {
  const messages: Record<
    Trigger,
    { title: string; description: string; benefits: string[] }
  > = {
    limit_reached: {
      title: "You've Hit Your Monthly Limit 🎯",
      description: "You're making great progress! Upgrade to keep optimizing your resume.",
      benefits: [
        "Unlimited optimizations this month",
        "No watermarks on exports",
        "GPT-4o for best results",
        "Cover letter generator included",
      ],
    },
    premium_feature: {
      title: `${featureName || "This"} is a Premium Feature 👑`,
      description: "Get access to advanced features that land interviews.",
      benefits: [
        `Unlock ${featureName || "this feature"} instantly`,
        "Custom resume templates",
        "LinkedIn profile optimization",
        "Priority support (24h response)",
      ],
    },
    watermark_notice: {
      title: "Remove the Watermark 📄",
      description: "Present a polished, professional resume to employers.",
      benefits: [
        "Clean, professional exports",
        "Multiple export formats (PDF, DOCX, TXT)",
        "Premium template designs",
        "Stand out from other candidates",
      ],
    },
  };

  const { title, description, benefits } = messages[trigger];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="space-y-2">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">Limited Time Offer</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Use code <code className="bg-white px-2 py-1 rounded">WELCOME50</code> for 50% off your
              first month
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/pricing";
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
