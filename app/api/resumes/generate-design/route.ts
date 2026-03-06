import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resumes } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ai, AI_MODEL } from '@/lib/openai';
import { z } from 'zod';

const designSchema = z.object({
  resumeId: z.string(),
  template: z.enum(['modern', 'classic', 'minimal', 'creative', 'executive', 'tech']).default('modern'),
  accentColor: z.string().default('#6366F1'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = designSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { resumeId, template, accentColor } = parsed.data;

    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const text = resume.improvedText || resume.originalText;

    const templateInstructions: Record<string, string> = {
      modern: 'Clean, contemporary design with subtle accent colors and clear section hierarchy. Use a left-aligned layout with subtle borders.',
      classic: 'Traditional, time-tested layout with serif considerations. Professional and conservative with clear structure.',
      minimal: 'Ultra-clean with maximum whitespace. Focus on typography and content hierarchy with no decorative elements.',
      creative: 'Bold design with creative use of color and layout. Feature the accent color prominently. Use a two-column layout.',
      executive: 'Premium, high-end design for senior roles. Dark header section with name/title, subtle use of color for emphasis.',
      tech: 'Developer-friendly layout with monospace elements for skills. Clean sidebar for contact/skills, main area for experience.',
    };

    const result = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional resume designer. Generate valid, self-contained HTML for a resume. The HTML must:
- Be a complete, self-contained document with inline CSS (no external resources)
- Use the accent color: ${accentColor}
- Style: ${templateInstructions[template]}
- Be ATS-friendly (proper heading hierarchy, semantic HTML)
- Use web-safe fonts only (Arial, Georgia, Courier New, etc.)
- Be responsive and print-friendly
- Size: US Letter (8.5x11 inches)
Return ONLY the HTML, no markdown or explanations.`,
        },
        {
          role: 'user',
          content: `Create a ${template} style resume design for this content:\n\n${text}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 6000,
    });

    let html = result.choices[0]?.message?.content || '';
    // Clean markdown wrapping if present
    html = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

    // Store in analysis metadata
    await db.update(resumes).set({
      analysis: { ...(resume.analysis || {}), designHtml: html, template, accentColor },
      updatedAt: new Date(),
    }).where(eq(resumes.id, resumeId));

    return NextResponse.json({ html, template, accentColor });
  } catch (error) {
    console.error('Design generation error:', error);
    return NextResponse.json({ message: 'Failed to generate design' }, { status: 500 });
  }
}
