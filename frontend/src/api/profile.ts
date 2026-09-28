import { supabase } from "@/integrations/supabase/client";
import { ApiError, friendlyMessage } from "./client";

const PROFILE_GET_URL = (import.meta.env['VITE_N8N_PROFILE_WEBHOOK_URL'] as string | undefined) ?? "";
const PROFILE_SAVE_URL = ((import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "").replace(/\/$/, "");

export type Profile = {
  email: string;
  city: string;
  position: string;
  linkedinUrl: string;
  cvText: string | null;
};

type RawProfile = {
  email?: string;
  location?: string;
  positions_of_interest?: string | string[];
  position_of_interest?: string;
  target_roles_json?: string | string[];
  cv_text?: string | null;
  linkedin_url?: string | null;
  linkedin?: string | null;
  resume?: { text?: string | null; file_url?: string | null; file_name?: string | null } | null;
};

type RawProfileResponse = {
  success?: boolean;
  profile?: RawProfile;
} & RawProfile;

function normalizeProfile(raw: RawProfileResponse): Profile {
  const src: RawProfile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const roles = src.positions_of_interest ?? src.target_roles_json ?? src.position_of_interest;
  let position = "";
  if (Array.isArray(roles)) {
    position = roles.filter((r): r is string => typeof r === "string").join(", ");
  } else if (typeof roles === "string") {
    try {
      const parsed: unknown = JSON.parse(roles);
      position = Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === "string").join(", ")
        : roles;
    } catch {
      position = roles;
    }
  }
  const cvText =
    (typeof src.resume?.text === "string" && src.resume.text.length > 0 ? src.resume.text : null) ??
    (typeof src.cv_text === "string" && src.cv_text.length > 0 ? src.cv_text : null);
  return {
    email: typeof src.email === "string" ? src.email : "",
    city: typeof src.location === "string" ? src.location : "",
    position,
    linkedinUrl: typeof src.linkedin_url === "string" ? src.linkedin_url : typeof src.linkedin === "string" ? src.linkedin : "",
    cvText,
  };
}

/**
 * Loads the profile from the n8n production webhook (GET), authenticated
 * with the current session Bearer token and auth_user_id query param.
 */
export async function getProfile(): Promise<{ success: boolean; profile: Profile }> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const url = new URL(PROFILE_GET_URL);
  if (session) url.searchParams.set("auth_user_id", session.user.id);

  const headers = new Headers();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  let response: Response;
  try {
    response = await fetch(url.toString(), { method: "GET", headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) throw new ApiError(response.status, friendlyMessage(response.status));

  let json: unknown = null;
  try { json = await response.json(); } catch { /* non-JSON body */ }
  if (json && typeof json === "object" && (json as { success?: boolean }).success === false) {
    throw new ApiError(400, friendlyMessage(400));
  }
  // n8n returns an array with a single object
  const first = Array.isArray(json) ? json[0] : json;
  const raw = (first ?? {}) as RawProfileResponse;
  return { success: raw.success !== false, profile: normalizeProfile(raw) };
}

export type SaveProfileInput = {
  email: string;
  city: string;
  position: string;
  linkedinUrl: string;
  cvFile: File | null;
};

/**
 * Sends the profile to the n8n production webhook as a multipart/form-data
 * POST with fields: email, city, position, auth_user_id and data (the CV
 * file, in binary). The CV file is optional — when omitted, the previously
 * stored CV text on the backend remains in effect.
 */
export async function saveProfile({ email, city, position, linkedinUrl, cvFile }: SaveProfileInput) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const form = new FormData();
  form.append("email", email);
  form.append("city", city);
  form.append("position", position);
  form.append("linkedin_url", linkedinUrl);
  if (session) form.append("auth_user_id", session.user.id);
  if (cvFile) form.append("data", cvFile, cvFile.name);

  const headers = new Headers();
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  let response: Response;
  try {
    response = await fetch(PROFILE_SAVE_URL, { method: "POST", body: form, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) throw new ApiError(response.status, friendlyMessage(response.status));

  let json: unknown = null;
  try { json = await response.json(); } catch { /* non-JSON body is fine */ }
  if (json && typeof json === "object" && (json as { success?: boolean }).success === false) {
    throw new ApiError(400, friendlyMessage(400));
  }
  return json as { success?: boolean } | null;
}
