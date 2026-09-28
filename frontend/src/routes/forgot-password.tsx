import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { AuthCard, FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — CareerAgent" },
      { name: "description", content: "Request a link to reset your CareerAgent password." },
      { property: "og:title", content: "Forgot password — CareerAgent" },
      { property: "og:description", content: "Request a link to reset your CareerAgent password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <AuthCard
        title="Reset your password"
        subtitle="We'll email you a link to choose a new password."
        footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
      >
        {sent ? (
          <p className="text-sm">If an account exists for this email, a password reset link has been sent.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </AuthCard>
    </PageShell>
  );
}
