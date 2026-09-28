import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptyOnboarding, submitOnboarding, type OnboardingData, type RemotePreference } from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — CareerAgent" },
      { name: "description", content: "Tell CareerAgent about your goals and learning priorities." },
      { property: "og:title", content: "Get started — CareerAgent" },
      { property: "og:description", content: "Tell CareerAgent about your goals and learning priorities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    </PageShell>
  ),
});

const REMOTE: { value: RemotePreference; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "flexible", label: "Flexible" },
];

function TagInput({ id, label, values, onChange, placeholder }: {
  id: string; label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim().slice(0, 100);
    if (v && !values.includes(v) && values.length < 20) onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="outline" onClick={add}>Add</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData>(emptyOnboarding);
  const [salary, setSalary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => setData((d) => ({ ...d, [k]: v }));

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError("CV must be a PDF or DOCX file.");
    if (file.size > 10 * 1024 * 1024) return setError("CV must be 10 MB or smaller.");
    set("cv_file_name", file.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = data.linkedin_url.trim();
    if (url && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(url)) return setError("Please enter a valid LinkedIn URL.");
    if (data.target_roles.length === 0) return setError("Add at least one target role.");
    const minSalary = salary.trim() ? Number(salary) : null;
    if (minSalary !== null && (!Number.isFinite(minSalary) || minSalary < 0)) return setError("Minimum salary must be a positive number.");
    setSaving(true);
    try {
      await submitOnboarding({ ...data, linkedin_url: url, current_location: data.current_location.trim(), min_salary: minSalary });
      navigate({ to: "/jobs" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Let's set up your job search</h1>
      <p className="mt-2 text-muted-foreground">Your agent uses this to find the right roles for you.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Input id="linkedin" type="url" value={data.linkedin_url} maxLength={255} placeholder="https://www.linkedin.com/in/you" onChange={(e) => set("linkedin_url", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Current location</Label>
          <Input id="location" value={data.current_location} maxLength={100} placeholder="Amsterdam, NL" onChange={(e) => set("current_location", e.target.value)} />
        </div>
        <TagInput id="roles" label="Target roles" values={data.target_roles} onChange={(v) => set("target_roles", v)} placeholder="e.g. AI Engineer" />
        <TagInput id="locations" label="Target locations" values={data.target_locations} onChange={(v) => set("target_locations", v)} placeholder="e.g. Berlin" />
        <TagInput id="industries" label="Preferred industries" values={data.preferred_industries} onChange={(v) => set("preferred_industries", v)} placeholder="e.g. Fintech" />
        <div className="space-y-2">
          <Label>Remote preference</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REMOTE.map((r) => (
              <button key={r.value} type="button" onClick={() => set("remote_preference", r.value)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${data.remote_preference === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Minimum desired salary (per year)</Label>
          <Input id="salary" type="number" min={0} inputMode="numeric" value={salary} placeholder="60000" onChange={(e) => setSalary(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cv">CV</Label>
          <button type="button" onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-accent">
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">{data.cv_file_name || "Upload CV"}</span>
            <span className="text-xs text-muted-foreground">PDF or DOCX · Maximum 10 MB</span>
          </button>
          <input id="cv" ref={fileInput} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : "Finish and find jobs"}</Button>
      </form>
    </div>
  );
}
