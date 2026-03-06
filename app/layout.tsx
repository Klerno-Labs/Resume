import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: {
    default: 'RewriteMe — AI-Powered Resume Builder',
    template: '%s | RewriteMe',
  },
  description:
    'Let Robert, your AI resume expert, build you a job-winning resume. ATS-optimized, professionally designed, powered by AI.',
  keywords: [
    'resume builder',
    'AI resume',
    'ATS optimization',
    'resume writer',
    'job application',
    'cover letter',
  ],
  openGraph: {
    title: 'RewriteMe — AI-Powered Resume Builder',
    description:
      'Let Robert, your AI resume expert, build you a job-winning resume.',
    url: 'https://rewriteme.app',
    siteName: 'RewriteMe',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RewriteMe — AI-Powered Resume Builder',
    description:
      'Let Robert, your AI resume expert, build you a job-winning resume.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
