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
            Effective Date: March 7, 2026 &mdash; Last Updated: March 7, 2026
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="glass rounded-2xl p-8">
              <h2 className="text-xl font-display font-bold text-white mb-4">
                {i + 1}. {section.title}
              </h2>
              <div className="text-brand-muted leading-relaxed space-y-3">
                {section.content.map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 glass rounded-2xl p-8 border border-brand-accent/20">
          <p className="text-brand-muted text-sm leading-relaxed">
            By creating an account, using our services, or purchasing credits on RewriteMe.app,
            you acknowledge that you have read, understood, and agree to be bound by these Terms of
            Service in their entirety. This agreement constitutes a legally
            binding contract between you and RewriteMe.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const sections = [
  {
    title: 'Agreement to Terms',
    content: [
      'This Terms of Service ("Agreement") is a legally binding contract between you ("Customer," "you," or "your") and RewriteMe ("Company," "we," "us," or "our"), governing your access to and use of RewriteMe.app and all related services, tools, and AI features (collectively, the "Service").',
      'By creating an account, accessing the Service, or purchasing any credit pack, you represent that you are at least 18 years of age and have the legal capacity to enter into this Agreement. If you do not agree to all terms herein, you must immediately discontinue use of the Service.',
    ],
  },
  {
    title: 'Service Description',
    content: [
      'RewriteMe provides AI-powered resume optimization, ATS (Applicant Tracking System) scoring, job description matching, cover letter generation, resume design templates, and related career document services through our proprietary AI assistant ("Robert").',
      'The Service is a tool to assist with resume creation and optimization. We make no representations, warranties, or guarantees regarding employment outcomes, interview rates, job offers, or career advancement resulting from use of the Service. Results vary based on individual qualifications, job market conditions, and factors outside our control.',
      'AI-generated content is provided as suggestions and recommendations. You are solely responsible for reviewing, verifying, and approving all content before submission to potential employers.',
    ],
  },
  {
    title: 'Credit Packs & Billing',
    content: [
      'RewriteMe offers one-time credit pack purchases. Credit packs ("Starter," "Pro," and "Premium") are available at the prices displayed on our pricing page at the time of purchase. There are no recurring charges or subscriptions.',
      'By purchasing a credit pack, you authorize RewriteMe to charge your designated payment method a one-time fee at the applicable rate. All prices are in US Dollars (USD) and are exclusive of applicable taxes.',
      'Credits are added to your account immediately upon successful payment, are cumulative (multiple purchases stack), and never expire. We reserve the right to modify pricing at any time; price changes do not affect previously purchased credits.',
    ],
  },
  {
    title: 'ALL SALES ARE FINAL — NO REFUNDS',
    content: [
      'ALL PURCHASES ARE FINAL AND NON-REFUNDABLE. BY COMPLETING A PURCHASE, YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT:',
      '(a) You will not receive a refund for any credit pack purchase, partial or full, under any circumstances including but not limited to: dissatisfaction with the Service, failure to use allocated credits, technical issues, changes to Service features, or any other reason.',
      '(b) Upon payment, you receive immediate access to resume credits and digital tools. Because the Service delivers digital goods and AI-processed content that cannot be "returned," all sales are considered final upon delivery of access.',
      '(c) If you dispute a charge with your bank or credit card company ("chargeback") without first attempting to resolve the issue directly with us, we reserve the right to immediately terminate your account, revoke access to all content and data, and pursue recovery of the disputed amount plus any fees incurred.',
      'This no-refund policy is a material term of this Agreement. You accept this policy each time you make a purchase.',
    ],
  },
  {
    title: 'Credits & Usage',
    content: [
      'Resume optimization credits are purchased through one-time credit packs. Credits are added to your account immediately upon purchase and are cumulative — purchasing additional packs adds to your existing balance.',
      'Credits never expire and have no cash value. Credits are non-transferable between accounts and are non-refundable.',
      'We reserve the right to implement reasonable usage limits to prevent abuse, including rate limiting on API calls and AI processing requests.',
    ],
  },
  {
    title: 'User Accounts & Responsibilities',
    content: [
      'You must provide accurate, current, and complete information when creating an account. You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      'You may not: (a) share your account credentials with third parties; (b) create multiple accounts to circumvent usage limits; (c) use the Service to create fraudulent, misleading, or deceptive resumes containing false information; (d) use automated tools, bots, or scripts to access the Service; (e) attempt to reverse engineer, decompile, or extract our AI models or proprietary algorithms.',
      'We reserve the right to suspend or terminate accounts that violate these terms without notice or refund.',
    ],
  },
  {
    title: 'Intellectual Property & Content Ownership',
    content: [
      'You retain ownership of all original content you upload or input into the Service, including personal information, work history, and qualifications.',
      'AI-generated optimizations, improvements, cover letters, and design outputs created by the Service become your property upon generation. You are granted a perpetual, non-exclusive license to use all output for personal and professional purposes.',
      'The Service itself, including all software, AI models, algorithms, templates, designs, branding, and proprietary technology, remains the exclusive property of RewriteMe and is protected by intellectual property laws.',
      'By uploading content, you grant RewriteMe a limited, non-exclusive license to process your content solely for the purpose of providing the Service. We will not sell, share, or use your personal resume content for any purpose other than delivering the Service to you.',
    ],
  },
  {
    title: 'Privacy & Data',
    content: [
      'Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as described therein.',
      'We implement commercially reasonable security measures to protect your data. However, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.',
      'You may request deletion of your account and associated data at any time. Account deletion is permanent and cannot be undone. Deletion does not entitle you to any refund.',
    ],
  },
  {
    title: 'Disclaimer of Warranties',
    content: [
      'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.',
      'We do not warrant that: (a) the Service will be uninterrupted, error-free, or secure; (b) AI-generated content will be free of errors or suitable for any specific purpose; (c) the Service will produce any particular employment outcome; (d) defects will be corrected within any timeframe.',
      'You acknowledge that AI technology is inherently imperfect and that all AI-generated content should be reviewed by you before use.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, REWRITEME, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.',
      'IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY EXCEED THE AMOUNT YOU ACTUALLY PAID TO REWRITEME IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.',
      'THIS LIMITATION APPLIES REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
    ],
  },
  {
    title: 'Indemnification',
    content: [
      'You agree to indemnify, defend, and hold harmless RewriteMe and its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys\' fees) arising out of or related to: (a) your use of the Service; (b) your violation of this Agreement; (c) your violation of any third-party rights; (d) any content you upload or submit through the Service.',
    ],
  },
  {
    title: 'Termination',
    content: [
      'You may delete your account at any time through your account settings. Account deletion is permanent and forfeits any remaining credits. No refunds will be issued for unused credits.',
      'We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Grounds for termination include but are not limited to: violation of these terms, fraudulent activity, abuse of the Service, or failure of payment.',
      'Upon termination, your right to use the Service ceases immediately. We may delete your account data after a reasonable retention period. Sections 4, 7, 9, 10, 11, and 13 survive termination.',
    ],
  },
  {
    title: 'Governing Law & Dispute Resolution',
    content: [
      'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles.',
      'Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, the dispute shall be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules.',
      'YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS ACTION, CLASS ARBITRATION, OR ANY OTHER REPRESENTATIVE PROCEEDING. You waive any right to participate in a class action lawsuit or class-wide arbitration.',
      'The prevailing party in any arbitration or legal proceeding shall be entitled to recover its reasonable attorneys\' fees and costs.',
    ],
  },
  {
    title: 'Modifications to Terms',
    content: [
      'We reserve the right to modify this Agreement at any time. Material changes will be communicated via email or prominent notice on the Service at least 14 days before taking effect.',
      'Your continued use of the Service after the effective date of any modifications constitutes your acceptance of the updated terms. If you do not agree to the modified terms, you must discontinue use of the Service.',
    ],
  },
  {
    title: 'General Provisions',
    content: [
      'Entire Agreement: This Agreement, together with our Privacy Policy, constitutes the entire agreement between you and RewriteMe regarding the Service and supersedes all prior agreements and understandings.',
      'Severability: If any provision of this Agreement is found to be unenforceable or invalid, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.',
      'Waiver: Our failure to enforce any right or provision of this Agreement shall not constitute a waiver of such right or provision.',
      'Assignment: You may not assign or transfer this Agreement without our prior written consent. We may assign this Agreement without restriction.',
      'Force Majeure: We shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including but not limited to natural disasters, acts of government, internet outages, or third-party service failures.',
    ],
  },
];
