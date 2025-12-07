import React from "react";
import Seo from "@/components/Seo";
import { Link } from "wouter";

export default function ResumeProductManager() {
  const title = "Product Manager Resume Optimization | AI Resume Repair";
  const description = "AI-powered resume optimization for product managers — surface impact, metrics, roadmaps, and cross-functional leadership for ATS and hiring managers.";

  return (
    <div className="min-h-screen bg-background font-sans">
      <Seo title={title} description={description} canonical="https://rewriteme.app/resume/product-manager" ogImage="https://rewriteme.app/og-image.png" />
      <main className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Product Manager Resume Optimization</h1>
        <p className="text-muted-foreground mb-6">AI-driven resume updates for PMs — emphasize product outcomes, metrics, and leadership in cross-functional teams.</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">What we optimize</h2>
          <ul className="list-disc ml-6 text-muted-foreground">
            <li>Product metrics and outcomes (MAU, retention, revenue)</li>
            <li>Roadmap leadership and stakeholder alignment</li>
            <li>Prioritization frameworks and impact statements</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Try it now</h2>
          <Link href="/ai-resume-builder"><button className="bg-primary text-white px-4 py-2 rounded">Optimize PM Resume</button></Link>
        </section>

        <footer className="text-sm text-muted-foreground">Back to <Link href="/ai-resume-builder">AI Resume Builder</Link></footer>
      </main>
    </div>
  );
}
