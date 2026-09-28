import { supabase } from "@/integrations/supabase/client";
import { ApiError, friendlyMessage } from "./client";

const BASE = "https://YOUR-N8N-HOST/webhook";
const COURSES_URL =
  (import.meta.env["VITE_N8N_COURSES_WEBHOOK_URL"] as string | undefined) ?? `${BASE}/courses`;
const COURSE_URL = `${BASE}/course`;
const JOB_COURSE_URL = `${BASE}/job-course`;
const COURSE_PROGRESS_URL = `${BASE}/course-progress`;
const COURSES_REGENERATE_URL =
  (import.meta.env["VITE_N8N_COURSES_REGENERATE_WEBHOOK_URL"] as string | undefined) ??
  `${BASE}/courses-regenerate`;

export type Resource = { title?: string; url?: string; source?: string; related_job_ids?: string[] };

export type CourseModule = {
  module_id: string;
  course_id: string;
  order_index: number;
  title: string;
  description?: string | null;
  content?: string | null;
  skill_name?: string | null;
  resources?: Resource[];
  importance_score?: number | null;
  market_demand_percent?: number | null;
  trend_percent?: number | null;
  status?: string | null;
  progress_percent?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  score?: number | null;
};

export type Course = {
  course_id: string;
  name: string;
  description?: string | null;
  role?: string | null;
  version?: number | null;
  jobs_analyzed?: number | null;
  generated_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  progress_percent?: number | null;
  completed_modules?: number | null;
  total_modules?: number | null;
  priority_score?: number | null;
  modules?: CourseModule[];
};

export type JobCourse = Record<string, unknown> & {
  job_id: string;
  title?: string;
  company_name?: string;
  job_url?: string | null;
  prep_status?: string | null;
  prep_role_type?: string | null;
  prep_updated_at?: string | null;
  company_summary?: string | null;
  role_summary?: string | null;
};

async function auth() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new ApiError(401, friendlyMessage(401));
  const { data: sessionData } = await supabase.auth.getSession();
  const headers = new Headers();
  if (sessionData.session) headers.set("Authorization", `Bearer ${sessionData.session.access_token}`);
  return { userId: user.id, headers };
}

async function request(url: string, init: RequestInit, tag: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    console.error(`[${tag}] fetch failed`, err);
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  let json: unknown = null;
  try { json = await res.json(); } catch (err) { console.error(`[${tag}] invalid JSON`, err); }
  if (Array.isArray(json)) json = json[0];
  if (!res.ok) {
    console.error(`[${tag}] HTTP error`, res.status, json);
    throw new ApiError(res.status, friendlyMessage(res.status));
  }
  const body = json as Record<string, unknown> | null;
  if (!body || body["success"] !== true) {
    console.error(`[${tag}] unsuccessful response`, json);
    throw new ApiError(500, friendlyMessage(500));
  }
  return body;
}

async function authedGet(url: string, params: Record<string, string>, tag: string) {
  const { userId, headers } = await auth();
  const qs = new URLSearchParams({ auth_user_id: userId, ...params });
  return request(`${url}?${qs.toString()}`, { method: "GET", headers }, tag);
}

/** Summary stats derived exactly like the backend. */
export function recalcCourse(c: Course): Course {
  const mods = c.modules ?? [];
  if (mods.length === 0) return c;
  const avg = Math.round(mods.reduce((s, m) => s + (m.progress_percent ?? 0), 0) / mods.length);
  return {
    ...c,
    progress_percent: avg,
    completed_modules: mods.filter((m) => (m.progress_percent ?? 0) >= 100).length,
    total_modules: mods.length,
    status: avg >= 100 ? "completed" : avg > 0 ? "in_progress" : "not_started",
  };
}

/** GET /courses — used on open and by Refresh Courses. */
export async function fetchCourses(): Promise<Course[]> {
  const body = await authedGet(COURSES_URL, {}, "courses");
  return Array.isArray(body["courses"]) ? (body["courses"] as Course[]) : [];
}

/** GET /course?course_id= — null means no course available. */
export async function fetchCourse(course_id: string): Promise<Course | null> {
  const body = await authedGet(COURSE_URL, { course_id }, "course");
  const c = (body["course"] as Course | null | undefined) ?? null;
  if (!c) return null;
  const modules = [...(Array.isArray(c.modules) ? c.modules : [])]
    .map((m) => ({ ...m, resources: Array.isArray(m.resources) ? m.resources : [] }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return { ...c, modules };
}

/** GET /job-course?job_id= — null means no preparation available. */
export async function fetchJobCourse(job_id: string): Promise<JobCourse | null> {
  const body = await authedGet(JOB_COURSE_URL, { job_id }, "job-course");
  const direct = body["job_course"] as JobCourse | null | undefined;
  if (direct) return direct;
  if (body["success"] !== true) return null;
  // n8n returns the preparation payload at the top level:
  // { success, job_id, prep_status, prep_role_type, courses: [{title,url,why}],
  //   skill_gaps, practice, interview_insights, likely_questions, plan, plan_markdown, ... }
  return {
    ...body,
    job_id: (body["job_id"] as string | undefined) ?? job_id,
  } as JobCourse;
}

/** POST /course-progress — persists module progress in n8n. */
export async function saveModuleProgress(course_id: string, module_id: string, progress_percent: number) {
  const { userId, headers } = await auth();
  headers.set("Content-Type", "application/json");
  const body = await request(
    COURSE_PROGRESS_URL,
    { method: "POST", headers, body: JSON.stringify({ auth_user_id: userId, course_id, module_id, progress_percent }) },
    "course-progress",
  );
  return {
    progress_percent: typeof body["progress_percent"] === "number" ? (body["progress_percent"] as number) : progress_percent,
    status: (body["status"] as string | undefined) ?? (progress_percent >= 100 ? "completed" : progress_percent > 0 ? "in_progress" : "not_started"),
  };
}

/**
 * POST /courses-regenerate — triggers course regeneration in n8n
 * (same authenticated pattern as the other course webhooks).
 */
export async function regenerateCourses(): Promise<void> {
  const { userId, headers } = await auth();
  const qs = new URLSearchParams({ auth_user_id: userId });
  let res: Response;
  try {
    res = await fetch(`${COURSES_REGENERATE_URL}?${qs.toString()}`, { method: "POST", headers });
  } catch (err) {
    console.error("[courses-regenerate] fetch failed", err);
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  let json: unknown = null;
  try { json = await res.json(); } catch (err) { console.error("[courses-regenerate] invalid JSON", err); }
  if (!res.ok) {
    console.error("[courses-regenerate] HTTP error", res.status, json);
    throw new ApiError(res.status, friendlyMessage(res.status));
  }
  if (json && typeof json === "object" && (json as { success?: boolean }).success === false) {
    console.error("[courses-regenerate] unsuccessful response", json);
    throw new ApiError(500, friendlyMessage(500));
  }
}
