import { EventEmitter } from 'events';

export type UploadJob = {
  resumeId: string;
  bucket: string;
  key: string;
  filename: string;
  userId: string;
};

const QUEUE_KEY = 'upload_jobs_v1';
const queue: UploadJob[] = [];
const events = new EventEmitter();

events.setMaxListeners(0);

export async function enqueueJob(job: UploadJob) {
  queue.push(job);
  events.emit(QUEUE_KEY);
}

export async function popJob(timeout = 5): Promise<UploadJob | null> {
  if (queue.length > 0) {
    return queue.shift() || null;
  }

  return new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      events.removeListener(QUEUE_KEY, onJob);
      clearTimeout(timer);
    };

    const onJob = () => {
      cleanup();
      resolve(queue.shift() || null);
    };

    const timer =
      timeout > 0
        ? setTimeout(() => {
            cleanup();
            resolve(null);
          }, timeout * 1000)
        : undefined;

    events.once(QUEUE_KEY, onJob);
  });
}
