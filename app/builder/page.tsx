import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ResumeBuilder } from '@/components/robert/resume-builder';

export const metadata = {
  title: 'Resume Builder',
  description: 'Let Robert build your perfect resume. Upload your existing resume or start from scratch.',
};

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-brand-navy pt-16">
        <ResumeBuilder initialTemplate={params.template} />
      </main>
      <Footer />
    </>
  );
}
