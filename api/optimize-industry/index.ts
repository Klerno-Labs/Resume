import type { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const industryPrompts: Record<string, string> = {
  technology: 'Focus on: Agile methodologies, API development, cloud platforms (AWS/Azure/GCP), DevOps practices, CI/CD, microservices, scalability, system architecture',
  finance: 'Focus on: Financial modeling, risk management, regulatory compliance (SOX, FINRA), portfolio management, financial analysis, audit processes, P&L statements',
  healthcare: 'Focus on: Patient care, HIPAA compliance, clinical protocols, medical terminology, EHR systems, quality improvement, patient outcomes, interdisciplinary collaboration',
  marketing: 'Focus on: Campaign management, marketing analytics, ROI optimization, SEO/SEM, content strategy, brand positioning, customer segmentation, A/B testing',
  sales: 'Focus on: Lead generation, CRM systems (Salesforce), revenue growth, pipeline management, client relationships, quota attainment, consultative selling, negotiations',
  education: 'Focus on: Curriculum development, student engagement, assessment strategies, classroom management, educational technology, differentiated instruction, learning outcomes',
  engineering: 'Focus on: CAD/CAM software, quality control, process optimization, Six Sigma, lean manufacturing, technical specifications, project lifecycle, safety standards',
  hr: 'Focus on: Talent acquisition, employee relations, HRIS systems, performance management, compensation & benefits, workforce planning, organizational development, compliance',
  legal: 'Focus on: Contract negotiation, regulatory compliance, litigation management, legal research, due diligence, corporate law, risk mitigation, legal documentation',
  design: 'Focus on: UI/UX design, Adobe Creative Suite, prototyping tools (Figma, Sketch), brand identity, user research, design systems, accessibility standards, visual hierarchy'
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeText, industry } = req.body;

    if (!resumeText || !industry) {
      return res.status(400).json({ error: 'Missing resumeText or industry' });
    }

    if (!industryPrompts[industry]) {
      return res.status(400).json({ error: 'Invalid industry' });
    }

    console.log(`[IndustryOptimizer] Optimizing for ${industry}...`);

    const prompt = `You are an expert resume writer specializing in ${industry}. Rewrite this resume to be highly optimized for ${industry} roles.

${industryPrompts[industry]}

ORIGINAL RESUME:
${resumeText.substring(0, 3000)}

Instructions:
1. Use industry-specific terminology and keywords
2. Emphasize relevant skills and technologies for ${industry}
3. Reframe achievements using metrics relevant to ${industry}
4. Use action verbs common in ${industry}
5. Maintain all factual information - only change phrasing and emphasis
6. Keep the same general structure
7. Make it ATS-friendly with proper keywords

Return ONLY the optimized resume text, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer specializing in ${industry}. Optimize resumes with industry-specific language while maintaining factual accuracy.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.7
    });

    const optimizedText = response.choices[0].message.content || resumeText;

    console.log('[IndustryOptimizer] Optimization complete');

    return res.json({ optimizedText });
  } catch (error) {
    console.error('[IndustryOptimizer] Error:', error);
    return res.status(500).json({ error: 'Failed to optimize for industry' });
  }
}
