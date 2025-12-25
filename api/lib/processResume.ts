import OpenAI from 'openai';
import { getSQL } from './db.js';

let _openai: OpenAI | null = null;

function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function processResume(resumeId: string, originalText: string, userId: string, userPlan: string) {
  try {
    const sql = getSQL();
    const openai = getOpenAI();
    const [optimizationResult, scoreResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume writer and career coach. Your task is to transform resumes into ATS-optimized, professional documents that highlight achievements and use strong action verbs. Always output valid JSON with an "improvedText" field containing the complete rewritten resume.'
          },
          {
            role: 'user',
            content: `Rewrite this resume to make it more professional and ATS-friendly. Follow these guidelines:

1. Use strong action verbs (Led, Managed, Achieved, Spearheaded, etc.)
2. Quantify achievements with numbers, percentages, or metrics
3. Remove weak language like "some", "most of the time", "still learning"
4. Make bullet points concise and impact-focused
5. Improve formatting and structure
6. Maintain all contact information and dates exactly as provided
7. Keep the same overall length and sections

Resume to improve:
${originalText}

Return ONLY valid JSON in this exact format:
{"improvedText": "the complete improved resume text here"}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500,
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an ATS (Applicant Tracking System) expert and resume evaluator. Analyze resumes and provide detailed scores and actionable feedback. Always output valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this resume and provide scores and specific issues:

Resume:
${originalText.substring(0, 1500)}

Evaluate:
1. ATS Score (0-100): How well would this pass automated screening systems?
   - Consider: keywords, formatting, structure, quantifiable achievements
2. Keywords Score (0-10): Presence of relevant industry keywords and action verbs
3. Formatting Score (0-10): Professional structure, consistency, readability
4. Issues: Specific problems to fix (weak verbs, missing metrics, formatting issues, etc.)

Return ONLY valid JSON in this exact format:
{
  "atsScore": 85,
  "keywordsScore": 7,
  "formattingScore": 8,
  "issues": [
    {"type": "weak-language", "message": "Replace 'some experience' with specific metrics", "severity": "high"},
    {"type": "missing-achievement", "message": "Add quantifiable results to work experience", "severity": "medium"}
  ]
}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      }),
    ]);

    const optimization = JSON.parse(optimizationResult.choices[0].message.content || '{}');
    const scores = JSON.parse(scoreResult.choices[0].message.content || '{}');

    await sql`
      UPDATE resumes SET
        improved_text = ${optimization.improvedText || originalText},
        ats_score = ${scores.atsScore || 70},
        keywords_score = ${scores.keywordsScore || 7},
        formatting_score = ${scores.formattingScore || 7},
        issues = ${JSON.stringify(scores.issues || [])},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${resumeId}
    `;
  } catch (error) {
    console.error('[Process] Error optimizing resume:', error);
    const sql = getSQL();
    await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;

    if (userPlan !== 'admin') {
      await sql`UPDATE users SET credits_remaining = credits_remaining + 1 WHERE id = ${userId}`;
      console.log(`[Credit] Refunded 1 credit to user ${userId} due to optimization failure`);
    }
  }
}

export default processResume;
