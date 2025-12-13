// Standalone upload test endpoint to verify multipart upload works
import type { VercelRequest, VercelResponse } from '@vercel/node';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Test Upload] Starting...');
    console.log('[Test Upload] Content-Type:', req.headers['content-type']);

    const files: Array<{ name: string; filename: string; mimetype: string; data: Buffer }> = [];
    const fields: Record<string, string> = {};

    const bb = busboy({ headers: req.headers as any });

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];

      console.log('[Test Upload] File field:', name, 'Filename:', filename, 'Type:', mimeType);

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('[Test Upload] File received:', filename, buffer.length, 'bytes');
        files.push({
          name,
          filename,
          mimetype: mimeType,
          data: buffer,
        });
      });
    });

    bb.on('field', (name, value) => {
      console.log('[Test Upload] Field:', name, '=', value);
      fields[name] = value;
    });

    await new Promise((resolve, reject) => {
      bb.on('finish', () => {
        console.log('[Test Upload] Parsing complete');
        resolve(true);
      });
      bb.on('error', (error) => {
        console.error('[Test Upload] Error:', error);
        reject(error);
      });
      req.pipe(bb);
    });

    if (files.length === 0) {
      return res.status(400).json({ error: 'No files received' });
    }

    const file = files[0];
    const text = file.data.toString('utf-8');

    return res.json({
      success: true,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.data.length,
      preview: text.substring(0, 200),
    });
  } catch (error: any) {
    console.error('[Test Upload] Fatal error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
}
