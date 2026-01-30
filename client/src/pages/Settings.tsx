import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Gift, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Link } from 'wouter';

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: SettingsIcon },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'referrals', label: 'Referrals', icon: Gift },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="space-y-4">
            {/* User Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground truncate">@{user?.email?.split('@')[0]}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          activeSection === section.id
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Profile</h1>
                  <p className="text-muted-foreground">Manage your personal information</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user?.name || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <Button>Save Changes</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button>Update Password</Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'account' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Account</h1>
                  <p className="text-muted-foreground">Manage your account settings</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Plan & Credits</CardTitle>
                    <CardDescription>View your current plan and available credits</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Current Plan</p>
                        <p className="text-sm text-muted-foreground">Manage your subscription</p>
                      </div>
                      <Badge variant={user?.plan === 'free' ? 'secondary' : 'default'} className="text-sm">
                        {user?.plan?.toUpperCase() || 'FREE'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Credits Remaining</p>
                        <p className="text-sm text-muted-foreground">Use credits to optimize resumes</p>
                      </div>
                      <p className="text-2xl font-bold">{user?.creditsRemaining || 0}</p>
                    </div>
                    {user?.plan === 'free' && (
                      <>
                        <Separator />
                        <Link href="/pricing">
                          <Button className="w-full">Upgrade Plan</Button>
                        </Link>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Connected Services</CardTitle>
                    <CardDescription>Services you use to sign in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <div>
                          <p className="font-semibold">Google</p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Connected</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Billing</h1>
                  <p className="text-muted-foreground">Manage your subscription and payment methods</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>Your current subscription plan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{user?.plan?.toUpperCase() || 'FREE'} Plan</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.plan === 'free' ? 'Limited features' : 'Full access to all features'}
                        </p>
                      </div>
                      {user?.plan !== 'free' && (
                        <Button variant="outline">Manage Subscription</Button>
                      )}
                    </div>
                    {user?.plan === 'free' && (
                      <>
                        <Separator />
                        <Link href="/pricing">
                          <Button className="w-full">Upgrade to unlock all features</Button>
                        </Link>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'referrals' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Referrals</h1>
                  <p className="text-muted-foreground">Invite friends and earn credits per complete referral</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Your Referral Link</CardTitle>
                    <CardDescription>Share this link with friends to earn bonus credits</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={`https://rewriteme.app/auth?ref=${user?.email?.split('@')[0]}`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://rewriteme.app/auth?ref=${user?.email?.split('@')[0]}`);
                        }}
                      >
                        Copy link
                      </Button>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="font-semibold text-primary">Earn 1 Free Credit</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        For every friend who signs up and optimizes their first resume using your referral link
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
