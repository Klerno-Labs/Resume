import { popJob } from '../server/lib/queue';
import { getObjectBuffer } from '../server/lib/s3';
import { parseFile } from '../server/lib/fileParser';
import { sql } from '../server/lib/db';
import { processResume } from '../server/lib/processResume';

async function handleJob() {
  try {
    const job = await popJob(10); // wait up to 10s for a job
    if (!job) return null;

    console.log('[Worker] Got job', job);

    const { resumeId, bucket, key, filename, userId } = job;

    try {
      const data = await getObjectBuffer(bucket, key);
      // Try to detect content type by filename extension fallback
      const ext = filename.split('.').pop() || '';
      let mimetype = 'application/octet-stream';
      if (ext === 'txt') mimetype = 'text/plain';
      if (ext === 'pdf') mimetype = 'application/pdf';
      if (ext === 'docx') mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      // parse file content
      const originalText = await parseFile(data, mimetype, filename);

      // Update resume with original text and mark processing
      await sql`
        UPDATE resumes SET original_text = ${originalText}, status = 'processing', updated_at = NOW()
        WHERE id = ${resumeId}
      `;

      // Call processing (OpenAI, scoring, etc.)
      await processResume(resumeId, originalText, userId, 'free').catch((err) => {
        console.error('[Worker] processResume error', err);
      });

      console.log('[Worker] Job processed', resumeId);
    } catch (err) {
      console.error('[Worker] Failed processing job', job, err);
      // mark resume failed
      try {
        await sql`UPDATE resumes SET status = 'failed' WHERE id = ${resumeId}`;
      } catch (e) {
        console.error('[Worker] Failed to mark resume failed', e);
      }
    }

    return true;
  } catch (err) {
    console.error('[Worker] Unexpected error', err);
    return null;
  }
}

async function runLoop() {
  console.log('[Worker] Starting upload worker');
  let keepRunning = true;

  process.on('SIGINT', () => (keepRunning = false));
  process.on('SIGTERM', () => (keepRunning = false));

  while (keepRunning) {
    try {
      await handleJob();
    } catch (err) {
      console.error('[Worker] Loop error', err);
    }
  }

  console.log('[Worker] Shutting down');
  process.exit(0);
}

if (require.main === module) {
  runLoop().catch((err) => {
    console.error('[Worker] Fatal error', err);
    process.exit(1);
  });
}
