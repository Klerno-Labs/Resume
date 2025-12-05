import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ResumeOptimizationResult {
  improvedText: string;
  issues: Array<{ type: string; message: string; severity: string }>;
  atsScore: number;
}

export async function optimizeResume(originalText: string): Promise<ResumeOptimizationResult> {
  const prompt = `You are an expert resume writer and ATS optimization specialist. Analyze the following resume and improve it.

ORIGINAL RESUME:
${originalText}

Your task:
1. Rewrite weak, passive language into strong, active voice with measurable achievements
2. Quantify accomplishments wherever possible (use percentages, numbers, timeframes)
3. Remove clichés and vague statements
4. Ensure ATS-friendly formatting (no tables, clean structure)
5. Identify and fix critical issues (weak verbs, missing keywords, poor formatting)
6. Calculate an ATS compatibility score (0-100)

Respond with JSON in this exact format:
{
  "improvedText": "the complete rewritten resume",
  "issues": [
    {"type": "weak_verb", "message": "Replaced 'Worked at' with 'Spearheaded'", "severity": "high"},
    {"type": "missing_keywords", "message": "Added relevant technical keywords", "severity": "medium"}
  ],
  "atsScore": 85
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content:
          "You are a professional resume optimization AI. Always respond with valid JSON matching the requested format.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return {
    improvedText: result.improvedText || originalText,
    issues: result.issues || [],
    atsScore: Math.max(0, Math.min(100, result.atsScore || 50)),
  };
}

interface CoverLetterResult {
  content: string;
}

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  tone: string = "professional"
): Promise<CoverLetterResult> {
  const toneInstructions = {
    professional: "professional, confident, and formal",
    enthusiastic: "enthusiastic, energetic, and passionate",
    academic: "academic, formal, and research-focused",
    creative: "creative, storytelling, and unique",
  };

  const prompt = `Based on the following resume and job description, write a compelling cover letter.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Write a ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional} cover letter that:
1. Highlights relevant experience from the resume
2. Addresses key requirements from the job description
3. Shows genuine interest and fit for the role
4. Is concise (250-300 words)
5. Includes a professional greeting and closing

Respond with JSON:
{
  "content": "the complete cover letter text"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "You are a professional cover letter writer. Always respond with valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return {
    content: result.content || "",
  };
}
