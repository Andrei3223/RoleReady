export type RemotePreference = "remote" | "hybrid" | "onsite" | "flexible";

/** Payload shape ready to POST to an n8n onboarding webhook (auth_user_id is added by apiFetch). */
export type OnboardingData = {
  linkedin_url: string;
  current_location: string;
  target_roles: string[];
  target_locations: string[];
  preferred_industries: string[];
  remote_preference: RemotePreference;
  min_salary: number | null;
  cv_file_name: string | null;
};

export const emptyOnboarding: OnboardingData = {
  linkedin_url: "",
  current_location: "",
  target_roles: [],
  target_locations: [],
  preferred_industries: [],
  remote_preference: "flexible",
  min_salary: null,
  cv_file_name: null,
};

/** Placeholder until the n8n webhook exists. Replace body with apiFetch("/onboarding", { method: "POST", body: JSON.stringify(data) }). */
export async function submitOnboarding(data: OnboardingData): Promise<void> {
  void data;
}
