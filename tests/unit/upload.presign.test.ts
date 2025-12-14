import { describe, it, expect, vi } from 'vitest';
import { api } from '../../client/src/lib/api';

class MockXHR {
  public status = 200;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public upload: any = {};
  private _url: string | null = null;

  open(method: string, url: string) {
    this._url = url;
  }
  setRequestHeader() {}
  send(_data: any) {
    // simulate progress
    setTimeout(() => {
      if (this.upload && this.upload.onprogress) {
        this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
      }
    }, 5);
    setTimeout(() => {
      if (this.upload && this.upload.onprogress) {
        this.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
      }
      if (this.onload) this.onload();
    }, 10);
  }
  abort() {
    if (this.onerror) this.onerror();
  }
}

describe('uploadResume presign flow', () => {
  it('uploads via presign and completes', async () => {
    // mock global.fetch for presign and complete
    const fetchMock = vi.fn();

    // presign response
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ url: 'https://s3.example/upload', key: 'uploads/1/resume.docx' }) })
    );

    // complete response
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ resumeId: 'r1', status: 'queued' }) }));

    // Replace global.fetch
    // @ts-ignore
    global.fetch = fetchMock as any;

    // Mock XMLHttpRequest
    // @ts-ignore
    global.XMLHttpRequest = MockXHR as any;

    const file = new File(['hello world content'], 'resume.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const result = await api.uploadResume(file, (p) => {
      // progress should be reported
      expect(p).toBeGreaterThanOrEqual(0);
    });

    expect(result.resumeId).toBe('r1');
  });
});
