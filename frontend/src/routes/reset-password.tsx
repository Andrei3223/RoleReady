import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AuthCard, FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — CareerAgent" },
      { name: "description", content: "Set a new password for your CareerAgent account." },
      { property: "og:title", content: "Choose a new password — CareerAgent" },
      { property: "og:description", content: "Set a new password for your CareerAgent account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await updatePassword(password);
      await signOut();
      navigate({ to: "/login", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <AuthCard
        title="Choose a new password"
        footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
      >
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your link...</p>
        ) : !session ? (
          <p className="text-sm">This reset link is invalid or has expired. <Link to="/forgot-password" className="font-medium text-primary hover:underline">Request a new one</Link>.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <FormError message={error} />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </AuthCard>
    </PageShell>
  );
}
