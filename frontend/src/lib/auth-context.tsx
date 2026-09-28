import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SignUpInput = { firstName: string; lastName: string; email: string; password: string };

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Canonical user identifier (Supabase user.id). */
  authUserId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns true when the user is signed in immediately (email confirmation disabled). */
  signUp: (input: SignUpInput) => Promise<{ signedIn: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function authErrorMessage(err: unknown): string {
  const e = err as { message?: string; status?: number; name?: string } | null;
  const msg = (e?.message ?? "").toLowerCase();
  if (e?.name === "AuthRetryableFetchError" || msg.includes("fetch") || msg.includes("network"))
    return "Network error. Check your connection and try again.";
  if (msg.includes("invalid login credentials")) return "Invalid email or password.";
  if (msg.includes("email not confirmed")) return "Email not confirmed. Please check your inbox for the confirmation link.";
  if (msg.includes("already registered")) return "An account with this email already exists.";
  if (msg.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("weak") || msg.includes("pwned")) return "This password is too weak or has appeared in a data breach. Choose another.";
  return e?.message || "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(authErrorMessage(error));
  }, []);

  const signUp = useCallback(async ({ firstName, lastName, email, password }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw new Error(authErrorMessage(error));
    return { signedIn: !!data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(authErrorMessage(error));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(authErrorMessage(error));
  }, []);

  const user = session?.user ?? null;
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        authUserId: user?.id ?? null,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function displayName(user: User | null): string {
  const m = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string };
  const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
  return name || user?.email || "";
}
