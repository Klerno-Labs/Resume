// API client for backend communication

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  creditsRemaining: number;
}

export interface Resume {
  id: string;
  userId?: string;
  fileName: string;
  originalText: string;
  improvedText?: string;
  atsScore?: number;
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

  // Auth
  async register(email: string, password: string, name?: string): Promise<{ user: User }> {
    const res = await fetch(`${this.baseUrl}/auth/register`, {
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
    const res = await fetch(`${this.baseUrl}/auth/login`, {
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

  // Resumes
  async uploadResume(file: File, userId: string): Promise<{ resumeId: string; status: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const res = await fetch(`${this.baseUrl}/resumes/upload`, {
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
    const res = await fetch(`${this.baseUrl}/resumes/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch resume");
    }
    return res.json();
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/resumes`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch resumes");
    }
    return res.json();
  }

  // Cover Letters
  async generateCoverLetter(
    userId: string,
    resumeId: string,
    jobDescription: string,
    tone: string
  ): Promise<CoverLetter> {
    const res = await fetch(`${this.baseUrl}/cover-letters/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, resumeId, jobDescription, tone }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to generate cover letter");
    }
    return res.json();
  }

  // Payments
  async createPayment(userId: string, plan: string): Promise<{ paymentId: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create payment");
    }
    return res.json();
  }

  async getPayment(id: string): Promise<Payment> {
    const res = await fetch(`${this.baseUrl}/payments/${id}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch payment");
    }
    return res.json();
  }
}

export const api = new ApiClient();
