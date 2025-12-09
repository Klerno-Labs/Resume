import { useState } from "react";
import { Gift, Users, TrendingUp, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ReferralDashboard() {
  const { toast } = useToast();
  const [referralCode] = useState(
    "RR" + Math.random().toString(36).substring(2, 10).toUpperCase(),
  );
  const [copied, setCopied] = useState(false);
  const [stats] = useState({
    totalReferrals: 0,
    paidConversions: 0,
    creditsEarned: 0,
  });

  const referralLink = `https://resumerepairer.com/?ref=${referralCode}`;

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Refer Friends, Get Rewards
          </CardTitle>
          <CardDescription>
            Give 5 free credits to friends, get 5 credits when they sign up + 10 bonus credits if
            they upgrade!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="flex-1" />
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                  <div className="text-xs text-muted-foreground">Total Referrals</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{stats.paidConversions}</div>
                  <div className="text-xs text-muted-foreground">Paid Conversions</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Gift className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{stats.creditsEarned}</div>
                  <div className="text-xs text-muted-foreground">Credits Earned</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
