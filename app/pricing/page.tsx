import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PricingPage } from '@/components/pricing/pricing-page';

export const metadata = {
  title: 'Pricing',
  description: 'Buy resume credits. One-time purchase, no subscriptions.',
};

export default function Pricing() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16">
        <PricingPage />
      </main>
      <Footer />
    </>
  );
}
