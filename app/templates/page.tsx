import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { TemplateGallery } from '@/components/templates/template-gallery';

export const metadata = {
  title: 'Resume Templates',
  description: '40+ professionally designed, ATS-friendly resume templates. Choose your style.',
};

export default function TemplatesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16">
        <TemplateGallery />
      </main>
      <Footer />
    </>
  );
}
