'use client';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-brand-muted text-lg">
            Last updated: March 2026
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">
                {section.title}
              </h2>
              <div className="text-brand-muted leading-relaxed space-y-3">
                {section.content.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

const sections = [
  {
    title: 'Information We Collect',
    content: [
      'We collect information you provide directly, including your name, email address, and resume content when you create an account and use our services.',
      'We automatically collect usage data such as pages visited, features used, and interaction patterns to improve our service.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'Your resume content is processed by our AI (Robert) solely to optimize and improve your resume. We do not sell or share your resume content with third parties.',
      'Account information is used to provide and maintain your account, process payments, and communicate service updates.',
    ],
  },
  {
    title: 'Data Storage & Security',
    content: [
      'Your data is stored securely using industry-standard encryption. Resume content and personal information are protected with AES-256 encryption at rest.',
      'We use secure HTTPS connections for all data transfers between your browser and our servers.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'You can access, update, or delete your account and all associated data at any time through your dashboard settings.',
      'You may request a complete export of your data or permanent deletion by contacting our support team.',
    ],
  },
  {
    title: 'Cookies & Tracking',
    content: [
      'We use essential cookies for authentication and session management. We do not use third-party advertising cookies.',
      'Analytics data is collected anonymously to improve the service and is not linked to individual user profiles.',
    ],
  },
  {
    title: 'Contact',
    content: [
      'For privacy-related questions or concerns, please contact us at privacy@rewriteme.app or through our contact page.',
    ],
  },
];
