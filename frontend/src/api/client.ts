import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = ((import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Some of the information is invalid. Please check and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do this.",
  404: "We couldn't find what you were looking for.",
  500: "Something went wrong on our side. Please try again later.",
};

export function friendlyMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? (status >= 500 ? STATUS_MESSAGES[500]! : "Something went wrong. Please try again.");
}

/**
 * Calls a protected n8n webhook. Sends the Supabase access token as a Bearer
 * header and adds `auth_user_id` (Supabase user.id) to JSON bodies.
 */
export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);

  let body = options.body;
  const method = (options.method ?? "GET").toUpperCase();
  if (session && method !== "GET") {
    let parsed: Record<string, unknown> = {};
    if (typeof body === "string" && body) {
      try { parsed = JSON.parse(body) as Record<string, unknown>; } catch { /* keep empty */ }
    }
    body = JSON.stringify({ ...parsed, auth_user_id: session.user.id });
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (session && method === "GET") {
    url += `${url.includes("?") ? "&" : "?"}auth_user_id=${encodeURIComponent(session.user.id)}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, body: body ?? null, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  let json: unknown = null;
  try { json = await response.json(); } catch { /* empty or non-JSON body */ }

  if (!response.ok) throw new ApiError(response.status, friendlyMessage(response.status));
  if (json && typeof json === "object" && (json as { success?: boolean }).success === false) {
    throw new ApiError(400, friendlyMessage(400));
  }
  return json as T;
}
