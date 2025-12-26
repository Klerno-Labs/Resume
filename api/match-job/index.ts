import type { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Missing resumeText or jobDescription' });
    }

    console.log('[JobMatcher] Analyzing job match...');

    const prompt = `You are an expert resume consultant and ATS specialist. Analyze how well this resume matches the job description.

RESUME:
${resumeText.substring(0, 3000)}

JOB DESCRIPTION:
${jobDescription.substring(0, 2000)}

Provide a detailed analysis in JSON format with:
1. "score" (0-100): Overall match percentage
2. "missingKeywords": Array of important keywords/skills from the job description missing in the resume
3. "strengths": Array of 3-5 things the resume does well that match the job
4. "suggestions": Array of 5-7 specific, actionable recommendations to improve the match

Focus on:
- Technical skills and keywords
- Years of experience
- Required qualifications
- Soft skills mentioned
- Industry-specific terminology

Be specific and actionable in your suggestions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ATS specialist and career coach. Provide detailed, actionable feedback in valid JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    console.log('[JobMatcher] Analysis complete:', {
      score: result.score,
      keywordsFound: result.missingKeywords?.length || 0,
      suggestionsCount: result.suggestions?.length || 0
    });

    return res.json(result);
  } catch (error) {
    console.error('[JobMatcher] Error:', error);
    return res.status(500).json({ error: 'Failed to analyze job match' });
  }
}
