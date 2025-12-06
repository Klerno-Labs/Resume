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

class ApiClient {
  private baseUrl = "/api";

  // Helper method to include credentials (cookies) in all requests
  private async fetchWithCredentials(url: string, options: RequestInit = {}) {
    return fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
    });
  }

  // Auth
  async register(email: string, password: string, name?: string): Promise<{ user: User }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Registration failed");
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
      throw new Error(error.error || "Login failed");
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
      throw new Error(error.error || "Email verification failed");
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
      throw new Error(error.error || "Failed to send reset email");
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
      throw new Error(error.error || "Password reset failed");
    }
    return res.json();
  }

  // Resumes
  async uploadResume(file: File): Promise<{ resumeId: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Upload failed");
    }
    return res.json();
  }

  async getResume(id: string): Promise<Resume> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/resumes/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch resume");
    }
    return res.json();
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/users/${userId}/resumes`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch resumes");
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
      throw new Error(error.error || "Failed to generate cover letter");
    }
    return res.json();
  }

  // Payments
  async createPayment(plan: string): Promise<{ paymentId: string; status: string; clientSecret?: string }> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create payment");
    }
    return res.json();
  }

  async getPayment(id: string): Promise<Payment> {
    const res = await this.fetchWithCredentials(`${this.baseUrl}/payments/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch payment");
    }
    return res.json();
  }
}

export const api = new ApiClient();
