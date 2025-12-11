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
  atsScore?: number;
  keywordsScore?: number;
  formattingScore?: number;
  issues?: Array<{ type: string; message: string; severity: string }>;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  private baseUrl = "/api";

  // Helper method to include credentials (cookies) in all requests
  private async fetchWithCredentials(url: string, options: RequestInit = {}) {
    return fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
    });
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        return error.message;
      }
      if ("error" in error && typeof error.error === "string") {
        return error.error;
      }
    }
    if (typeof error === "string") {
      return error;
    }
    return fallback;
  }

  // Auth
  async register(
    email: string,
    password: string,
    name?: string,
    referralCode?: string,
  ): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, referralCode }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Registration failed"));
    }
    return res.json();
  }

  async login(email: string, password: string): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Login failed"));
    }
    return res.json();
  }

  async logout(): Promise<void> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/logout`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Logout failed");
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/me`);
    if (!res.ok) {
      throw new Error("Not authenticated");
    }
    return res.json();
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Email verification failed"));
    }
    return res.json();
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to send reset email"));
    }
    return res.json();
  }

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Password reset failed"));
    }
    return res.json();
  }

  // Resumes
  async uploadResume(file: File): Promise<{ resumeId: string; status: string; isDuplicate?: boolean; message?: string; originalUploadDate?: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Upload failed"));
    }
    return res.json();
  }

  async getResume(id: string): Promise<Resume> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to fetch resume"));
    }
    return res.json();
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/users/${userId}/resumes`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to fetch resumes"));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId, jobDescription, tone }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to generate cover letter"));
    }
    return res.json();
  }

  // Design templates (powered by Figma)
  async getDesignTemplates(fileKey?: string): Promise<{ templates: FigmaTemplate[]; sourceFileKey: string }> {
    const query = fileKey ? `?fileKey=${encodeURIComponent(fileKey)}` : "";
    const res = await this.fetchWithCredentials(`${this.baseUrl}/design/templates${query}`);
    if (!res.ok) {
      let message = "Failed to fetch design templates";
      try {
        const error = await res.json();
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to create checkout"));
    }
    return res.json();
  }

  async verifyPayment(sessionId: string): Promise<{ success: boolean; plan: string; credits: number }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to verify payment"));
    }
    return res.json();
  }

  async createPayment(plan: string): Promise<{ paymentId: string; status: string; clientSecret?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to create payment"));
    }
    return res.json();
  }

  async getPayment(id: string): Promise<Payment> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to fetch payment"));
    }
    return res.json();
  }

  // Subscriptions
  async createSubscriptionCheckout(
    planId: string,
    billingInterval: "month" | "year" = "month",
  ): Promise<{ sessionUrl?: string; url?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, billingInterval }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to start subscription checkout"));
    }
    return res.json();
  }

  async createCreditCheckout(packSize: "small" | "medium" | "large"): Promise<{ sessionUrl: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/credits/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to start credit checkout"));
    }
    return res.json();
  }

  async cancelSubscription(): Promise<{ success: boolean; endsAt?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to cancel subscription"));
    }
    return res.json();
  }

  async reactivateSubscription(): Promise<{ success: boolean }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/reactivate`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to reactivate subscription"));
    }
    return res.json();
  }

  async getUsage(): Promise<any> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/subscriptions/usage`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(this.toErrorMessage(error, "Failed to fetch usage analytics"));
    }
    return res.json();
  }
}

export const api = new ApiClient();
