import { supabase } from "@/integrations/supabase/client";
import { ApiError, friendlyMessage } from "./client";

const REFERRAL_URL =
  (import.meta.env["VITE_N8N_JOB_REFERRAL_WEBHOOK_URL"] as string | undefined) ??
  "https://YOUR-N8N-HOST/webhook/job-referral";


export type ReferralContact = {
  draft_id: number;
  contact_name: string;
  contact_linkedin_url: string | null;
  contact_headline: string | null;
  tier: "alumni" | "ex_colleague" | "same_team" | "recruiter" | string;
  score: number;
  match_reasons: string[];
  email: string | null;
  email_status: "found" | "guessed" | "not_found" | string;
  channel: string | null;
  subject: string | null;
  body: string | null;
  linkedin_note: string | null;
  gmail_draft_id: string | null;
  status: string | null;
};

export type JobReferral = {
  job_id: string;
  job_title: string | null;
  company: string | null;
  job_url: string | null;
  /** "drafted" = contacts found, "no_contacts" = searched but none, "not_generated" = nothing yet */
  status: string | null;
  contacts_count: number;
  contacts: ReferralContact[];
};

/** GET /job-referral?auth_user_id=&job_id= — null means no referral data for this job. */
export async function fetchJobReferral(job_id: string): Promise<JobReferral | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new ApiError(401, friendlyMessage(401));
  const { data: sessionData } = await supabase.auth.getSession();

  const headers = new Headers();
  if (sessionData.session) headers.set("Authorization", `Bearer ${sessionData.session.access_token}`);
  const qs = new URLSearchParams({ auth_user_id: user.id, job_id });

  let res: Response;
  try {
    res = await fetch(`${REFERRAL_URL}?${qs.toString()}`, { method: "GET", headers });
  } catch (err) {
    console.error("[job-referral] fetch failed", err);
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch (err) {
    console.error("[job-referral] invalid JSON", err);
  }
  if (Array.isArray(json)) json = json[0];
  if (!res.ok) {
    console.error("[job-referral] HTTP error", res.status, json);
    throw new ApiError(res.status, friendlyMessage(res.status));
  }
  const body = json as Record<string, unknown> | null;
  if (!body || body["success"] !== true) {
    console.error("[job-referral] unsuccessful response", json);
    throw new ApiError(500, friendlyMessage(500));
  }
  const contacts = Array.isArray(body["contacts"]) ? (body["contacts"] as ReferralContact[]) : [];
  contacts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return {
    job_id: (body["job_id"] as string | undefined) ?? job_id,
    job_title: (body["job_title"] as string | null | undefined) ?? null,
    company: (body["company"] as string | null | undefined) ?? null,
    job_url: (body["job_url"] as string | null | undefined) ?? null,
    status: (body["status"] as string | null | undefined) ?? null,
    contacts_count: typeof body["contacts_count"] === "number" ? (body["contacts_count"] as number) : contacts.length,
    contacts,
  };
}

/**
 * Builds a Gmail compose URL with the recipient, subject and body prefilled.
 * Purely frontend — the user opens, reviews and sends the email themselves.
 * https://support.google.com/mail/answer/19330 (compose via URL params)
 */
export function buildGmailComposeUrl(options: { to: string; subject: string; body: string }): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: options.to,
    su: options.subject,
    body: options.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** mailto: fallback for users who don't use Gmail's web compose. */
export function buildMailtoUrl(options: { to: string; subject: string; body: string }): string {
  const params = new URLSearchParams({ subject: options.subject, body: options.body });
  return `mailto:${options.to}?${params.toString().replace(/\+/g, "%20")}`;
}
