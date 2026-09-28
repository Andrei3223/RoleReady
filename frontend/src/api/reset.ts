import { supabase } from "@/integrations/supabase/client";
import { ApiError, friendlyMessage } from "./client";

const RESET_URL =
  (import.meta.env["VITE_N8N_USER_DATA_RESET_WEBHOOK_URL"] as string | undefined) ??
  "https://YOUR-N8N-HOST/webhook/user-data-reset";

export type ResetCounts = Record<string, number>;

export type ResetResult = {
  success: boolean;
  dryRun: boolean;
  status: string;
  deleted: ResetCounts;
  planned?: ResetCounts | undefined;
  keptShared?: ResetCounts | undefined;
  profileKept?: boolean | undefined;
  error?: string | undefined;
};

function normalize(json: unknown, dryRun: boolean): ResetResult {
  const first = Array.isArray(json) ? json[0] : json;
  const raw = (first ?? {}) as Record<string, unknown>;
  const counts = (key: string): ResetCounts => {
    const v = raw[key];
    return v && typeof v === "object" ? (v as ResetCounts) : {};
  };
  return {
    success: raw["success"] === true,
    dryRun: raw["dry_run"] === true || dryRun,
    status: typeof raw["status"] === "string" ? raw["status"] : "",
    deleted: counts("deleted"),
    planned: counts("planned"),
    keptShared: counts("kept_shared"),
    profileKept: raw["profile_kept"] === true,
    error: typeof raw["error"] === "string" ? raw["error"] : undefined,
  };
}

/**
 * POSTs to the n8n user-data-reset webhook. With dryRun=true nothing is
 * deleted and the response carries the counts of what would be removed.
 */
export async function resetUserData(dryRun: boolean): Promise<ResetResult> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new ApiError(401, "You need to be signed in.");

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("Authorization", `Bearer ${session.access_token}`);

  let response: Response;
  try {
    response = await fetch(RESET_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ auth_user_id: session.user.id, dry_run: dryRun }),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) throw new ApiError(response.status, friendlyMessage(response.status));

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    /* non-JSON body */
  }
  const result = normalize(json, dryRun);
  if (!result.success) {
    throw new ApiError(400, result.error === "user_not_found" ? "Account data was not found." : "Could not reset your data.");
  }
  return result;
}

const COUNT_LABELS: Record<string, string> = {
  user_jobs: "saved jobs",
  jobs: "job listings",
  referral_drafts: "referral drafts",
  user_learning: "learning progress entries",
  courses: "courses",
  course_modules: "course modules",
  job_preparations: "job preparations",
  job_connections: "job connections",
  connections: "connections",
};

export function formatCounts(counts: ResetCounts): string[] {
  return Object.entries(counts)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([key, n]) => `${n} ${COUNT_LABELS[key] ?? key.replace(/_/g, " ")}`);
}
