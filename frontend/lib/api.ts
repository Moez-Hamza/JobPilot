const BASE_URL = "/api";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_description?: string;
  url: string;
  status: "Matched" | "Applied" | "Interviewing" | "Rejected" | "Offer";
  date_discovered?: string;
  date_applied?: string;
  rejection_email_raw?: string;
  rejection_reason_category?: string;
  ai_feedback_notes?: string;
}

export interface UserPreferences {
  id: number;
  target_titles: string[];
  target_locations: string[];
  experience_level: string;
  keywords_include: string[];
  keywords_exclude: string[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getJobs: (status?: string, search?: string, limit = 12, offset = 0) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    return request<Job[]>(`/jobs?${params.toString()}`);
  },

  getJob: (id: string) => request<Job>(`/jobs/${id}`),

  createJob: (data: Partial<Job>) =>
    request<Job>("/jobs", { method: "POST", body: JSON.stringify(data) }),

  updateJobStatus: (id: string, status: Job["status"]) =>
    request<Job>(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteJob: (id: string) =>
    request<void>(`/jobs/${id}`, { method: "DELETE" }),

  getPreferences: () => request<UserPreferences>("/preferences"),

  savePreferences: (data: Omit<UserPreferences, "id">) =>
    request<UserPreferences>("/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  analyzeRejection: (jobId: string, rejection_email: string) =>
    request<{ category: string; summary_of_weakness: string }>(
      `/ai/analyze-rejection/${jobId}`,
      { method: "POST", body: JSON.stringify({ rejection_email }) }
    ),

  optimizeResume: (job_description: string, resume_bullets: string) =>
    request<{
      optimized_bullets: string[];
      strategy_notes: string;
      historical_feedback_used: unknown[];
    }>("/ai/optimize-resume", {
      method: "POST",
      body: JSON.stringify({ job_description, resume_bullets }),
    }),

  triggerScrape: () =>
    request("/scraper/trigger", { method: "POST", body: JSON.stringify({ force: true }) }),
};
