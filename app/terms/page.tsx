'use client';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4">
            Terms of Service
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
    title: 'Acceptance of Terms',
    content: [
      'By accessing or using RewriteMe.app, you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.',
    ],
  },
  {
    title: 'Service Description',
    content: [
      'RewriteMe provides AI-powered resume optimization, ATS scoring, job matching, and cover letter generation through our AI assistant, Robert.',
      'Our service is designed to assist with resume creation and optimization. We do not guarantee employment outcomes.',
    ],
  },
  {
    title: 'User Accounts',
    content: [
      'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.',
      'You may not share your account with others or use another person\'s account without permission.',
    ],
  },
  {
    title: 'Content Ownership',
    content: [
      'You retain ownership of all resume content you upload or create. By using our service, you grant us a limited license to process your content for optimization purposes.',
      'AI-generated improvements and suggestions become part of your content once generated. You own the final output.',
    ],
  },
  {
    title: 'Payments & Refunds',
    content: [
      'Paid plans are billed on a recurring basis. You can cancel at any time, and your plan will remain active until the end of the current billing period.',
      'We offer a 30-day money-back guarantee on all paid plans. Contact support for refund requests.',
    ],
  },
  {
    title: 'Acceptable Use',
    content: [
      'You may not use the service to create fraudulent, misleading, or deceptive resumes. Content must be truthful and represent your actual qualifications.',
      'Automated scraping, bulk processing, or reverse engineering of our AI systems is prohibited.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'RewriteMe is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.',
      'Our total liability is limited to the amount you paid for the service in the 12 months preceding the claim.',
    ],
  },
  {
    title: 'Changes to Terms',
    content: [
      'We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.',
      'For questions about these terms, contact us at legal@rewriteme.app.',
    ],
  },
];
