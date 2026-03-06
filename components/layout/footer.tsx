import Link from 'next/link';
import { Bot } from 'lucide-react';

const footerLinks = {
  Product: [
    { href: '/builder', label: 'Resume Builder' },
    { href: '/create-resume', label: 'Create Resume' },
    { href: '/templates', label: 'Templates' },
    { href: '/pricing', label: 'Pricing' },
  ],
  Resources: [
    { href: '/about', label: 'About Robert' },
    { href: '/contact', label: 'Help Center' },
    { href: '/dashboard', label: 'Dashboard' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-brand-navy border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Rewrite<span className="text-brand-accent-light">Me</span>
              </span>
            </Link>
            <p className="text-brand-muted text-sm leading-relaxed">
              Let Robert, your AI resume expert, craft the perfect resume.
              ATS-optimized. Professionally designed. Built to land interviews.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-brand-muted text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brand-muted text-sm">
            &copy; {new Date().getFullYear()} RewriteMe. All rights reserved.
          </p>
          <p className="text-brand-muted text-xs">
            Powered by Robert AI &mdash; Your personal resume architect
          </p>
        </div>
      </div>
    </footer>
  );
}
