import OpenAI from "openai";
import crypto from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use gpt-4o-mini for maximum speed
const FAST_MODEL = "gpt-4o-mini";

// Simple in-memory cache for resume results
const resumeCache = new Map<string, { result: ResumeOptimizationResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

function getCacheKey(text: string): string {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

interface ResumeOptimizationResult {
  improvedText: string;
  issues: Array<{ type: string; message: string; severity: string }>;
  atsScore: number;
  keywordsScore?: number;
  formattingScore?: number;
}

// Parallel optimization - split work into concurrent requests
export async function optimizeResume(originalText: string): Promise<ResumeOptimizationResult> {
  // Check cache first
  const cacheKey = getCacheKey(originalText);
  const cached = resumeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('Resume cache hit!');
    return cached.result;
  }

  // Run analysis and optimization in parallel for speed
  const [optimizationResult, scoreResult] = await Promise.all([
    // Task 1: Optimize the resume text
    openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        { role: "system", content: "Optimize resumes. Output JSON only." },
        { role: "user", content: `Rewrite this resume with strong action verbs and quantified achievements. Keep same structure.

${originalText}

{"improvedText": "optimized resume"}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2500,
      temperature: 0.5,
    }),
    // Task 2: Score and analyze (smaller, faster)
    openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        { role: "system", content: "Score resumes. Output JSON only." },
        { role: "user", content: `Score this resume for ATS compatibility.

${originalText.substring(0, 1500)}

{"atsScore": 0-100, "keywordsScore": 0-10, "formattingScore": 0-10, "issues": [{"type": "issue", "message": "fix", "severity": "high"}]}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3,
    })
  ]);

  const optimization = JSON.parse(optimizationResult.choices[0].message.content || "{}");
  const scores = JSON.parse(scoreResult.choices[0].message.content || "{}");

  const result: ResumeOptimizationResult = {
    improvedText: optimization.improvedText || originalText,
    issues: scores.issues || [],
    atsScore: Math.max(0, Math.min(100, scores.atsScore || 70)),
    keywordsScore: scores.keywordsScore ? Math.max(0, Math.min(10, scores.keywordsScore)) : 7,
    formattingScore: scores.formattingScore ? Math.max(0, Math.min(10, scores.formattingScore)) : 7,
  };

  // Cache the result
  resumeCache.set(cacheKey, { result, timestamp: Date.now() });
  
  // Cleanup old cache entries
  if (resumeCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of resumeCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        resumeCache.delete(key);
      }
    }
  }

  return result;
}

interface CoverLetterResult {
  content: string;
}

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  tone: string = "professional"
): Promise<CoverLetterResult> {
  const toneMap: Record<string, string> = {
    professional: "professional",
    enthusiastic: "enthusiastic",
    academic: "academic",
    creative: "creative",
  };

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: `Write ${toneMap[tone] || 'professional'} cover letters. JSON only.` },
      { role: "user", content: `250-word cover letter.

Resume: ${resumeText.substring(0, 1000)}
Job: ${jobDescription.substring(0, 500)}

{"content": "letter"}` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 1000,
    temperature: 0.6,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return { content: result.content || "" };
}
