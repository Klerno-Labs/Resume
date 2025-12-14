import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export function getS3Client() {
  const region = process.env.AWS_REGION || 'us-east-1';
  return new S3Client({ region });
}

export async function getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await s3.send(cmd);
  const stream = res.Body as any;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function presignPutUrl(): Promise<never> {
  throw new Error('presign handled in api layer');
}

export { PutObjectCommand, GetObjectCommand };
