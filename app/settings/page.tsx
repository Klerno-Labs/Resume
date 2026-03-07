'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { motion } from 'framer-motion';
import { User, Lock, CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'security' | 'billing';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  creditsRemaining: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          setProfileForm({ name: data.name || '', email: data.email });
        } else {
          router.push('/login');
        }
        setLoading(false);
      });
  }, [router]);

  const handleProfileSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) setMessage('Profile updated!');
      else {
        const data = await res.json();
        setMessage(data.message || 'Failed to update');
      }
    } catch {
      setMessage('Something went wrong');
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setMessage('Passwords do not match');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        setMessage('Password changed!');
        setPasswordForm({ current: '', newPassword: '', confirm: '' });
      } else {
        const data = await res.json();
        setMessage(data.message || 'Failed to change password');
      }
    } catch {
      setMessage('Something went wrong');
    }
    setSaving(false);
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setMessage('Failed to start checkout');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This will permanently delete all your resumes, cover letters, and account data. This cannot be undone.')) return;
    if (!confirm('This is your last chance. Type OK to confirm you want to permanently delete everything.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setMessage(data.message || 'Failed to delete account');
      }
    } catch {
      setMessage('Something went wrong');
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy pt-16 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 text-brand-accent-light animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-display font-bold text-white mb-8">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-white/5 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setMessage(''); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === t.id ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-white'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'mb-6 p-3 rounded-lg text-sm',
              message.includes('!') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            )}
          >
            {message}
          </motion.div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 space-y-6">
            <div>
              <label className="block text-sm text-brand-muted mb-1.5">Name</label>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1.5">Email</label>
              <input
                value={profileForm.email}
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-brand-muted text-sm cursor-not-allowed"
              />
              <p className="text-xs text-brand-muted mt-1">Email cannot be changed</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-brand-muted">Plan:</span>
              <span className="px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent-light text-xs font-semibold uppercase">
                {user?.plan}
              </span>
              <span className="text-sm text-brand-muted">{user?.creditsRemaining} credits</span>
            </div>
            <button
              onClick={handleProfileSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 space-y-6">
            <h3 className="text-white font-semibold">Change Password</h3>
            <div>
              <label className="block text-sm text-brand-muted mb-1.5">Current Password</label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1.5">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
              <p className="text-xs text-brand-muted mt-1">Min 12 chars, uppercase, lowercase, number, special character</p>
            </div>
            <div>
              <label className="block text-sm text-brand-muted mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-brand-accent to-purple-500 rounded-xl text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-accent/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </motion.div>
        )}

        {/* Billing Tab */}
        {tab === 'billing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass rounded-2xl p-8">
              <h3 className="text-white font-semibold mb-4">Current Plan</h3>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-display font-bold text-white capitalize">{user?.plan}</span>
                <span className="text-brand-muted">{user?.creditsRemaining} credits remaining</span>
              </div>
              {user?.plan === 'free' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(['basic', 'pro', 'premium'] as const).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handleUpgrade(plan)}
                      className={cn(
                        'p-4 rounded-xl text-left transition-all',
                        plan === 'pro'
                          ? 'bg-gradient-to-br from-brand-accent/20 to-purple-500/20 border border-brand-accent/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      )}
                    >
                      <div className="text-white font-semibold capitalize mb-1">{plan}</div>
                      <div className="text-brand-muted text-xs">
                        {plan === 'basic' && '$5.99/mo — 15 credits'}
                        {plan === 'pro' && '$12/mo — 50 credits'}
                        {plan === 'premium' && '$29/mo — 200 credits'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Danger Zone */}
        {tab === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400 font-semibold">Danger Zone</h3>
            </div>
            <p className="text-brand-muted text-sm">
              Permanently delete your account and all associated data including resumes, cover letters, and settings. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-6 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
