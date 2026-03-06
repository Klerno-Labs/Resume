import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/home/hero';
import { FeaturesSection } from '@/components/home/features';
import { ProcessSection } from '@/components/home/process';
import { RobertSection } from '@/components/home/robert-intro';
import { PricingPreview } from '@/components/home/pricing-preview';
import { SocialProof } from '@/components/home/social-proof';
import { FAQSection } from '@/components/home/faq';
import { CTASection } from '@/components/home/cta';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SocialProof />
        <FeaturesSection />
        <RobertSection />
        <ProcessSection />
        <PricingPreview />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
