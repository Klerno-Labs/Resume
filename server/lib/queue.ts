import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const QUEUE_KEY = 'upload_jobs_v1';

export type UploadJob = {
  resumeId: string;
  bucket: string;
  key: string;
  filename: string;
  userId: string;
};

export async function enqueueJob(job: UploadJob) {
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
}

export async function popJob(timeout = 5): Promise<UploadJob | null> {
  // BRPOP returns [key, value] or null on timeout
  const res = await redis.brpop(QUEUE_KEY, timeout);
  if (!res) return null;
  try {
    const payload = JSON.parse(res[1]);
    return payload as UploadJob;
  } catch (err) {
    console.error('Failed to parse job payload', err);
    return null;
  }
}

export default redis;
