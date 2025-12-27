import type { Request, Response } from 'express';
import { generateResumeDesign } from '../lib/processResume.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeId } = req.body;

  if (!resumeId) {
    return res.status(400).json({ error: 'Resume ID is required' });
  }

  try {
    console.log(`[API] Design generation requested for resume ${resumeId}`);

    const result = await generateResumeDesign(resumeId);

    console.log(`[API] Design generation completed for resume ${resumeId}`);

    return res.json(result);
  } catch (error) {
    console.error(`[API] Design generation failed for resume ${resumeId}:`, error);
    return res.status(500).json({
      error: 'Design generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
