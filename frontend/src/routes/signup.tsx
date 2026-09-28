import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { AuthCard, FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — CareerAgent" },
      { name: "description", content: "Create a CareerAgent account and build a learning path around your goals." },
      { property: "og:title", content: "Create your account — CareerAgent" },
      { property: "og:description", content: "Create a CareerAgent account and build a learning path around your goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const justSignedUp = useRef(false);
  // Bounce already-signed-in visitors; a fresh signup navigates to onboarding itself.
  useEffect(() => {
    if (!loading && isAuthenticated && !justSignedUp.current) navigate({ to: "/jobs", replace: true });
  }, [loading, isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError("First and last name are required.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!terms) return setError("Please accept the Terms and Privacy Policy.");
    setSubmitting(true);
    justSignedUp.current = true;
    try {
      const { signedIn } = await signUp({
        firstName: firstName.trim().slice(0, 100),
        lastName: lastName.trim().slice(0, 100),
        email: email.trim(),
        password,
      });
      if (signedIn) navigate({ to: "/onboarding" });
      else setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkEmail) {
    return (
      <PageShell>
        <AuthCard title="Almost there" footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 size-5 text-primary" />
            <p className="text-sm">Check your email to confirm your account.</p>
          </div>
        </AuthCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AuthCard
        title="Create your account"
        subtitle="Build a learning path around your next move."
        footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first">First name</Label>
              <Input id="first" autoComplete="given-name" value={firstName} maxLength={100} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last">Last name</Label>
              <Input id="last" autoComplete="family-name" value={lastName} maxLength={100} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug">I accept the Terms and Privacy Policy</Label>
          </div>
          <FormError message={error} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </AuthCard>
    </PageShell>
  );
}
