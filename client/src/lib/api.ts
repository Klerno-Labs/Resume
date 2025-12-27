// API client for backend communication

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  creditsRemaining: number;
  emailVerified?: boolean;
}

export interface Resume {
  id: string;
  userId?: string;
  fileName: string;
  originalText: string;
  improvedText?: string;
  improvedHtml?: string;
  atsScore?: number;
  keywordsScore?: number;
  formattingScore?: number;
  issues?: Array<{ type: string; message: string; severity: string }>;
  status: string;
  createdAt: string;
  updatedAt: string;
  requiresUpgrade?: boolean;
}

export interface CoverLetter {
  id: string;
  userId?: string;
  resumeId?: string;
  jobDescription: string;
  tone: string;
  content: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId?: string;
  plan: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface FigmaTemplate {
  id: string;
  name: string;
  page: string;
  type: string;
  documentPath: string;
  imageUrl?: string;
}

class ApiClient {
  private baseUrl = '/api';

  // Helper method to include credentials (cookies) in all requests
  private async fetchWithCredentials(url: string, options: RequestInit = {}) {
    return fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
    });
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error;
      }
    }
    if (typeof error === 'string') {
      return error;
    }
    return fallback;
  }

  // Auth
  async register(
    email: string,
    password: string,
    name?: string,
    referralCode?: string
  ): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, referralCode }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Registration failed'));
    }
    return res.json() as Promise<{ user: User }>;
  }

  async login(email: string, password: string): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Login failed'));
    }
    return res.json() as Promise<{ user: User }>;
  }

  async logout(): Promise<void> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Logout failed');
    }
  }

  async getCurrentUser(): Promise<{ user: User | null; authenticated: boolean }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/me`);
    if (!res.ok) {
      if (res.status === 401) {
        return { user: null, authenticated: false };
      }
      let message = 'Failed to get current user';
      try {
        const error = await res.json() as { message?: string };
        message = this.toErrorMessage(error, message);
      } catch {
        // ignore parse errors and fall back to default message
      }
      throw new Error(message);
    }

    const data = (await res.json()) as { user?: User | null; authenticated?: boolean };
    return {
      user: data.user ?? null,
      authenticated: data.authenticated ?? Boolean(data.user),
    };
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Email verification failed'));
    }
    return res.json() as Promise<{ success: boolean; message: string }>;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to send reset email'));
    }
    return res.json() as Promise<{ success: boolean; message: string }>;
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Password reset failed'));
    }
    return res.json() as Promise<{ success: boolean; message: string }>;
  }

  // Resumes
  async uploadResume(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<{
    resumeId: string;
    status: string;
    isDuplicate?: boolean;
    message?: string;
    originalUploadDate?: string;
  }> {
    // Try presign flow first (direct-to-S3). If anything fails, fall back to multipart upload.
    try {
      const presignRes = await this.fetchWithCredentials(`${this.baseUrl}/uploads/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
        signal,
      });

      if (presignRes.ok) {
        const { url, key } = await presignRes.json() as { url: string; key: string };

        // Upload file to presigned URL using XHR so we can report progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          let aborted = false;

          const onAbort = () => {
            aborted = true;
            try {
              xhr.abort();
            } catch {
              // Ignore XHR abort errors
            }
            reject(new Error('Upload aborted'));
          };

          if (signal) {
            if (signal.aborted) return onAbort();
            signal.addEventListener('abort', onAbort);
          }

          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable && onProgress) {
              const percent = Math.round((e.loaded / e.total) * 100);
              try {
                onProgress(percent);
              } catch {
                // Ignore progress callback errors
              }
            }
          };

          xhr.onload = function () {
            if (signal) signal.removeEventListener('abort', onAbort);
            if (aborted) return;
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload to storage failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = function () {
            if (signal) signal.removeEventListener('abort', onAbort);
            if (aborted) return;
            reject(new Error('Network error during upload to storage'));
          };

          xhr.send(file);
        });

        // Tell server the upload is complete so it can fetch/process
        const completeRes = await this.fetchWithCredentials(`${this.baseUrl}/uploads/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, filename: file.name }),
          signal,
        });

        if (!completeRes.ok) {
          const error = await completeRes.json() as { message?: string };
          throw new Error(this.toErrorMessage(error, 'Upload completion failed'));
        }

        return completeRes.json() as Promise<{
          resumeId: string;
          status: string;
          isDuplicate?: boolean;
          message?: string;
          originalUploadDate?: string;
        }>;
      }
    } catch {
      // Fall through to multipart upload fallback (don't log err - it's unused)
    }

    // Fallback: multipart POST to /resumes/upload with XHR for progress tracking
    console.log('[api.uploadResume] Using multipart fallback upload');

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/resumes/upload`, true);
      xhr.withCredentials = true; // Include cookies

      let aborted = false;

      const onAbort = () => {
        aborted = true;
        try {
          xhr.abort();
        } catch {
          // Ignore XHR abort errors
        }
        reject(new Error('Upload aborted'));
      };

      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener('abort', onAbort);
      }

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          try {
            onProgress(percent);
          } catch {
            // Ignore progress callback errors
          }
        }
      };

      xhr.onload = function () {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (aborted) return;

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as {
              resumeId: string;
              status: string;
              isDuplicate?: boolean;
              message?: string;
              originalUploadDate?: string;
            };
            console.log('[api.uploadResume] Multipart upload successful:', result);
            resolve(result);
          } catch {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText) as { message?: string; error?: string };
            reject(new Error(error.message || error.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = function () {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (aborted) return;
        reject(new Error('Network error during multipart upload'));
      };

      console.log('[api.uploadResume] Sending multipart form data...');
      xhr.send(formData);
    });
  }

  async getResume(id: string): Promise<Resume> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/${id}`);
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to fetch resume'));
    }
    return res.json() as Promise<Resume>;
  }

  async listResumes(): Promise<{
    resumes: Array<{
      id: string;
      fileName: string;
      atsScore?: number;
      keywordsScore?: number;
      formattingScore?: number;
      status: string;
      hasDesign: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/list`);
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to fetch resumes'));
    }
    return res.json() as Promise<{
      resumes: Array<{
        id: string;
        fileName: string;
        atsScore?: number;
        keywordsScore?: number;
        formattingScore?: number;
        status: string;
        hasDesign: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
  }

  async regenerateDesign(resumeId: string): Promise<{
    success: boolean;
    improvedHtml: string;
    templateName: string;
    style: string;
    regenerationsUsed: number;
    regenerationsLimit: number;
    regenerationsRemaining: number;
  }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/regenerate-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string; error?: string };
      throw new Error(error.message || error.error || 'Failed to regenerate design');
    }
    return res.json() as Promise<{
      success: boolean;
      improvedHtml: string;
      templateName: string;
      style: string;
      regenerationsUsed: number;
      regenerationsLimit: number;
      regenerationsRemaining: number;
    }>;
  }

  async generateDesign(resumeId: string): Promise<{ success: boolean; html: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/generate-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string; error?: string };
      throw new Error(error.message || error.error || 'Failed to generate design');
    }
    return res.json() as Promise<{ success: boolean; html: string }>;
  }

  async previewDesigns(resumeId: string): Promise<{
    success: boolean;
    previews: Array<{
      templateName: string;
      templateStyle: string;
      layout: string;
      accentColor: string;
      html: string;
      contrastPassed: boolean;
      contrastSummary: {
        totalChecks: number;
        passedAA: number;
        passedAAA: number;
        failedAA: number;
      };
    }>;
  }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/preview-designs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string; error?: string };
      throw new Error(error.message || error.error || 'Failed to generate design previews');
    }
    return res.json() as Promise<{
      success: boolean;
      previews: Array<{
        templateName: string;
        templateStyle: string;
        layout: string;
        accentColor: string;
        html: string;
        contrastPassed: boolean;
        contrastSummary: {
          totalChecks: number;
          passedAA: number;
          passedAAA: number;
          failedAA: number;
        };
      }>;
    }>;
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/users/${userId}/resumes`);
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to fetch resumes'));
    }
    return res.json();
  }

  // Cover Letters
  async generateCoverLetter(
    resumeId: string,
    jobDescription: string,
    tone: string
  ): Promise<CoverLetter> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/cover-letters/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId, jobDescription, tone }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to generate cover letter'));
    }
    return res.json();
  }

  // Design templates (powered by Figma)
  async getDesignTemplates(
    fileKey?: string
  ): Promise<{ templates: FigmaTemplate[]; sourceFileKey: string }> {
    const query = fileKey ? `?fileKey=${encodeURIComponent(fileKey)}` : '';
    const res = await this.fetchWithCredentials(`${this.baseUrl}/design/templates${query}`);
    if (!res.ok) {
      let message = 'Failed to fetch design templates';
      try {
        const error = await res.json() as { message?: string };
        message = this.toErrorMessage(error, message);
      } catch {
        // ignore JSON parse error
      }
      throw new Error(message);
    }
    return res.json();
  }

  // Payments
  async createCheckout(plan: string): Promise<{ url: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to create checkout'));
    }
    return res.json();
  }

  async verifyPayment(
    sessionId: string
  ): Promise<{ success: boolean; plan: string; credits: number }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to verify payment'));
    }
    return res.json();
  }

  async createPayment(
    plan: string
  ): Promise<{ paymentId: string; status: string; clientSecret?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to create payment'));
    }
    return res.json();
  }

  async getPayment(id: string): Promise<Payment> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/${id}`);
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to fetch payment'));
    }
    return res.json();
  }

  // Subscriptions
  async createSubscriptionCheckout(
    planId: string,
    billingInterval: 'month' | 'year' = 'month'
  ): Promise<{ sessionUrl?: string; url?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, billingInterval }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to start subscription checkout'));
    }
    return res.json();
  }

  async createCreditCheckout(
    packSize: 'small' | 'medium' | 'large'
  ): Promise<{ sessionUrl: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/credits/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packSize }),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to start credit checkout'));
    }
    return res.json();
  }

  async cancelSubscription(): Promise<{ success: boolean; endsAt?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/cancel`, {
      method: 'POST',
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to cancel subscription'));
    }
    return res.json();
  }

  async reactivateSubscription(): Promise<{ success: boolean }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/reactivate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to reactivate subscription'));
    }
    return res.json();
  }

  async getUsage(): Promise<any> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/usage`);
    if (!res.ok) {
      const error = await res.json() as { message?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to fetch usage analytics'));
    }
    return res.json();
  }

  async saveTemplate(params: {
    name: string;
    style: 'modern' | 'classic' | 'creative' | 'minimal';
    description: string;
    htmlContent: string;
    isPublic?: boolean;
  }): Promise<{
    success: boolean;
    template: {
      id: string;
      name: string;
      style: string;
      description: string;
      createdAt: string;
    };
    message: string;
  }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/templates/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json() as { message?: string; error?: string };
      throw new Error(this.toErrorMessage(error, 'Failed to save template'));
    }
    return res.json();
  }
}

export const api = new ApiClient();
