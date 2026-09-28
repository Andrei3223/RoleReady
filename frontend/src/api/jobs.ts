import { supabase } from "@/integrations/supabase/client";
import { ApiError, friendlyMessage } from "./client";

const JOBS_URL =
  (import.meta.env["VITE_N8N_JOBS_WEBHOOK_URL"] as string | undefined) ??
  "https://YOUR-N8N-HOST/webhook/jobs";

const JOBS_REFRESH_URL =
  (import.meta.env["VITE_N8N_JOBS_REFRESH_WEBHOOK_URL"] as string | undefined) ??
  "https://YOUR-N8N-HOST/webhook/jobs-refresh";

export type Job = {
  id: string;
  job_id?: string;
  title: string;
  company_name: string;
  company_url: string | null;
  job_url: string | null;
  location: string | null;
  remote_type: string | null;
  employment_type: string | null;
  description: string | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  published_at: string | null;
  match_score: number | null;
  priority_score: number | null;
  status: string | null;
  match_reason: string | null;
  company_risk_score: number | null;
  saved: boolean;
  applied_at: string | null;
  interview_at: string | null;
  matched_skills: string[];
  missing_skills: string[];
};

async function fetchFromUrl(url: string): Promise<Job[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new ApiError(401, friendlyMessage(401));
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  const headers = new Headers();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  const fullUrl = `${url}${url.includes("?") ? "&" : "?"}auth_user_id=${encodeURIComponent(user.id)}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, { method: "GET", headers });
  } catch (err) {
    console.error("[jobs] fetch failed", err);
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch (err) {
    console.error("[jobs] invalid JSON", err);
  }
  if (!res.ok) {
    console.error("[jobs] HTTP error", res.status, json);
    throw new ApiError(res.status, friendlyMessage(res.status));
  }
  const body = json as { success?: boolean; jobs?: unknown } | null;
  if (!body || body.success !== true) {
    console.error("[jobs] unsuccessful response", json);
    throw new ApiError(500, friendlyMessage(500));
  }
  return Array.isArray(body.jobs) ? (body.jobs as Job[]) : [];
}

/** Initial page load — hits the main jobs webhook. */
export function fetchJobs(): Promise<Job[]> {
  return fetchFromUrl(JOBS_URL);
}

/** Refresh button — hits the jobs-refresh webhook. */
export function refreshJobs(): Promise<Job[]> {
  return fetchFromUrl(JOBS_REFRESH_URL);
}
