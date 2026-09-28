import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, Loader2, MapPin, RefreshCw, RotateCcw, Sparkles, Target, Upload } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { displayName, useAuth } from "@/lib/auth-context";
import { getProfile, saveProfile } from "@/api/profile";
import { regenerateCourses } from "@/api/courses";
import { formatCounts, resetUserData, type ResetCounts } from "@/api/reset";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — CareerAgent" },
      { name: "description", content: "Keep your CareerAgent profile current for more relevant learning paths." },
      { property: "og:title", content: "My profile — CareerAgent" },
      { property: "og:description", content: "Keep your CareerAgent profile current for more relevant learning paths." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <ProfileForm />
      </ProtectedRoute>
    </PageShell>
  ),
});

const MAX_CV_BYTES = 10 * 1024 * 1024;

function ProfileForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [position, setPosition] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMessage, setRegenMessage] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [resetPreview, setResetPreview] = useState<ResetCounts | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState<string[] | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile()
      .then((res) => {
        setEmail(res.profile?.email || user?.email || "");
        setCity(res.profile?.city ?? "");
        setPosition(res.profile?.position ?? "");
        setLinkedinUrl(res.profile?.linkedinUrl ?? "");
        setCvText(res.profile?.cvText ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile."))
      .finally(() => setLoading(false));
  }, [user?.email]);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return setCvFile(null);
    const ok = /\.(pdf|docx)$/i.test(file.name);
    if (!ok) return setError("CV must be a PDF or DOCX file.");
    if (file.size > MAX_CV_BYTES) return setError("CV must be 10 MB or smaller.");
    setCvFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveProfile({
        email: email || user?.email || "",
        city: city.trim().slice(0, 100),
        position: position.trim().slice(0, 100),
        linkedinUrl: linkedinUrl.trim().slice(0, 300),
        cvFile,
      });
      if (cvFile) setCvText("uploaded");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setRegenMessage(null);
    setRegenError(null);
    setRegenerating(true);
    try {
      await regenerateCourses();
      setRegenMessage("Course regeneration started. Your courses will update shortly.");
    } catch (err) {
      console.error("[profile] regenerateCourses failed", err);
      setRegenError(err instanceof Error ? err.message : "Could not regenerate courses.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleResetPreview() {
    setResetError(null);
    setResetDone(null);
    setResetLoading(true);
    try {
      const res = await resetUserData(true);
      setResetPreview(res.deleted);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not check your data.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetConfirm() {
    setResetError(null);
    setResetLoading(true);
    try {
      const res = await resetUserData(false);
      setResetDone(formatCounts(res.deleted));
      setResetPreview(null);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not reset your data.");
    } finally {
      setResetLoading(false);
    }
  }

  const name = displayName(user);
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CA";
  const completedItems = [email || user?.email, city, position, cvText || cvFile].filter(Boolean).length;
  const completion = completedItems * 25;

  return (
    <div className="relative isolate mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute left-10 top-16 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase text-primary">Career workspace</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Your profile</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">The stronger your profile, the more precisely CareerAgent can shape your learning path.</p>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading profile...
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-lg border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
              <div className="relative mx-auto flex size-20 items-center justify-center rounded-full border-4 border-background bg-accent font-display text-2xl font-bold text-accent-foreground shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_24%,transparent)]">
                {initials}
                <span className="absolute bottom-0 right-0 size-4 rounded-full border-[3px] border-card bg-primary" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{name}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{email || user?.email}</p>
              {position && <p className="mt-3 text-sm font-semibold text-primary">{position}</p>}
              {city && <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {city}</p>}
            </section>

            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Profile strength</p>
                <span className="text-sm font-bold text-primary">{completion}%</span>
              </div>
              <Progress value={completion} className="mt-3" />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Email, location, career goal, and CV help shape more focused courses.</p>
            </section>

            <section className="rounded-lg border border-primary/25 bg-primary/5 p-5">
              <Sparkles className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">Rebuild your learning path</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Use your latest profile details to generate updated course recommendations.</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => void handleRegenerate()} disabled={regenerating}>
                <RefreshCw className={`size-4 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Refreshing..." : "Refresh Courses"}
              </Button>
              {regenMessage && <p className="mt-3 text-xs font-medium text-primary">{regenMessage}</p>}
              {regenError && <div className="mt-3"><FormError message={regenError} /></div>}
            </section>

            <section className="rounded-lg border border-destructive/25 bg-destructive/5 p-5">
              <RotateCcw className="size-5 text-destructive" />
              <h3 className="mt-3 text-sm font-semibold">Reboot account</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Delete all found jobs, courses, learning progress and referrals. Your profile, CV and career goal stay untouched.
              </p>
              {!resetPreview && !resetDone && (
                <Button variant="outline" className="mt-4 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void handleResetPreview()} disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  {resetLoading ? "Checking..." : "Reboot account"}
                </Button>
              )}
              {resetPreview && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-destructive/30 bg-card p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive"><AlertTriangle className="size-3.5" /> This will permanently delete:</p>
                    <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                      {formatCounts(resetPreview).length > 0
                        ? formatCounts(resetPreview).map((line) => <li key={line}>{line}</li>)
                        : <li>Nothing to delete — your data is already clear.</li>}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setResetPreview(null)} disabled={resetLoading}>Cancel</Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => void handleResetConfirm()} disabled={resetLoading}>
                      {resetLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                      {resetLoading ? "Deleting..." : "Delete all"}
                    </Button>
                  </div>
                </div>
              )}
              {resetDone && (
                <div className="mt-4 rounded-md border border-primary/25 bg-primary/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><CheckCircle2 className="size-3.5" /> Account rebooted</p>
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                    {resetDone.length > 0 ? resetDone.map((line) => <li key={line}>Removed {line}</li>) : <li>Nothing needed removing.</li>}
                  </ul>
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setResetDone(null)}>Done</Button>
                </div>
              )}
              {resetError && <div className="mt-3"><FormError message={resetError} /></div>}
            </section>
          </aside>

          <form onSubmit={handleSubmit} className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
            <section className="border-b border-border p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><Target className="size-4" /></span>
                <div><h2 className="text-lg font-semibold">Career direction</h2><p className="mt-1 text-sm text-muted-foreground">Tell us where you are and where you want to go.</p></div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} maxLength={100} placeholder="Eindhoven" onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Desired position</Label>
                  <Input id="position" value={position} maxLength={100} placeholder="ML Engineer" onChange={(e) => setPosition(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input id="linkedin" type="url" value={linkedinUrl} maxLength={300} placeholder="https://www.linkedin.com/in/your-name" onChange={(e) => setLinkedinUrl(e.target.value)} />
                </div>
              </div>
            </section>

            <section className="p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><FileText className="size-4" /></span>
                <div><h2 className="text-lg font-semibold">Career document</h2><p className="mt-1 text-sm text-muted-foreground">Review the saved text or upload a newer CV when needed.</p></div>
              </div>
              <div className="mt-6 space-y-3">
                {cvText && !cvFile && (
                  <div className="overflow-hidden rounded-md border border-border bg-surface-subtle">
                    <Button type="button" variant="ghost" onClick={() => setCvOpen((open) => !open)} className="h-auto w-full justify-between rounded-none px-4 py-3">
                      <span className="flex items-center gap-2 text-left"><CheckCircle2 className="size-4 shrink-0 text-primary" /> CV saved — view extracted text</span>
                      <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${cvOpen ? "rotate-180" : ""}`} />
                    </Button>
                    {cvOpen && <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-border px-4 py-4 text-xs leading-5 text-muted-foreground">{cvText === "uploaded" ? "Your new CV was uploaded. Reload the page to view its text." : cvText}</pre>}
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} className="h-auto w-full flex-col gap-2 border-dashed bg-surface-subtle py-8 hover:border-primary">
                  <Upload className="size-5 text-primary" />
                  <span>{cvFile?.name || (cvText ? "Replace CV" : "Upload CV")}</span>
                  <span className="text-xs font-normal text-muted-foreground">PDF or DOCX · Maximum 10 MB</span>
                </Button>
                <input id="cv" ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-border bg-surface-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div><FormError message={error} />{saved && <p className="flex items-center gap-2 text-sm font-medium text-primary"><CheckCircle2 className="size-4" /> Profile saved</p>}</div>
              <Button type="submit" className="w-full sm:w-auto" disabled={saving}>{saving ? "Saving profile..." : "Save profile"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
