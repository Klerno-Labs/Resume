import { useState } from 'react';
import { Gift, Users, TrendingUp, Copy, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export function ReferralDashboard() {
  const { toast } = useToast();
  const [referralCode] = useState('RR' + Math.random().toString(36).substring(2, 10).toUpperCase());
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
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const statCards = [
    {
      icon: Users,
      value: stats.totalReferrals,
      label: 'Total Referrals',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
    },
    {
      icon: TrendingUp,
      value: stats.paidConversions,
      label: 'Paid Conversions',
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
    },
    {
      icon: Gift,
      value: stats.creditsEarned,
      label: 'Credits Earned',
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-2 border-purple-200 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-purple-500/10 via-pink-500/10 to-transparent rounded-full blur-3xl"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <span className="bg-linear-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent font-bold">
                Refer Friends, Get Rewards
              </span>
            </CardTitle>
            <CardDescription className="text-sm">
              Give 5 free credits to friends, get 5 credits when they sign up + 10 bonus credits if
              they upgrade!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={referralLink}
                  readOnly
                  className="border-2 border-purple-200 focus:border-purple-400 transition-colors pr-10"
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-pulse" />
              </div>
              <Button
                onClick={copyToClipboard}
                className="bg-linear-to-r from-purple-500 via-pink-500 to-purple-600 hover:opacity-90 transition-opacity"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {statCards.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Card className={`border-2 ${stat.borderColor} bg-linear-to-br ${stat.bgGradient} hover:shadow-lg transition-all duration-300 group`}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="relative inline-block mb-3">
                          <div className={`absolute inset-0 bg-linear-to-br ${stat.gradient} opacity-20 blur-xl rounded-full`}></div>
                          <div className={`relative w-12 h-12 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className={`text-3xl font-bold bg-linear-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                          {stat.value}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-1">
                          {stat.label}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
