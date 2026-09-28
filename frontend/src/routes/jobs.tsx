import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, GraduationCap, Loader2, MapPin, RefreshCw, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { fetchJobs, refreshJobs, type Job } from "@/api/jobs";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — CareerAgent" },
      { name: "description", content: "Career opportunities matched to your CareerAgent profile." },
      { property: "og:title", content: "Jobs — CareerAgent" },
      { property: "og:description", content: "Career opportunities matched to your CareerAgent profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <JobsPage />
      </ProtectedRoute>
    </PageShell>
  ),
});

function salary(j: Job) {
  if (j.salary_min == null && j.salary_max == null) return null;
  const c = j.salary_currency ?? "";
  return [j.salary_min, j.salary_max].filter((v) => v != null).map((v) => `${c} ${v!.toLocaleString()}`).join(" – ");
}

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await fetchJobs());
    } catch (err) {
      console.error("[jobs] loadJobs failed, retrying once", err);
      // The n8n test listener can be slow to answer on the first hit — retry once.
      try {
        await new Promise((r) => setTimeout(r, 1200));
        setJobs(await fetchJobs());
      } catch (err2) {
        console.error("[jobs] loadJobs failed", err2);
        setError(err2 instanceof Error ? err2.message : "Could not load jobs.");
        setJobs([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await refreshJobs());
    } catch (err) {
      console.error("[jobs] handleRefresh failed", err);
      setError(err instanceof Error ? err.message : "Could not refresh jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-2 text-muted-foreground">Vacancies your agent found for you.</p>
        </div>
        <Button variant="outline" onClick={() => void handleRefresh()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Jobs
        </Button>
      </div>

      <div className="mt-8">
        <FormError message={error} />
        {error && !loading && (
          <Button variant="outline" className="mt-3" onClick={() => void loadJobs()}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading jobs...
          </div>
        ) : !error && jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-medium">No jobs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your agent's job matches will appear here soon.</p>
            <ol className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm">
              <li className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">1</span>
                <span className="text-muted-foreground">
                  Make sure you uploaded your <span className="font-medium text-foreground">resume</span> on your{" "}
                  <Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">profile page</Link>.
                </span>
              </li>
              <li className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">2</span>
                <span className="text-muted-foreground">
                  It may take up to <span className="font-medium text-foreground">2 minutes</span> to prepare the jobs list — come back shortly and press{" "}
                  <span className="font-medium text-foreground">Refresh Jobs</span>.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <ul className="space-y-4">
            {jobs.map((j) => (
              <li key={j.job_id ?? j.id} className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{j.title}</h2>
                    <p className="text-sm text-muted-foreground">{j.company_name}</p>
                  </div>
                  {j.match_score != null && (
                    <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">{j.match_score}% match</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {j.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{j.location}</span>}
                  {j.remote_type && <span>{j.remote_type}</span>}
                  {j.employment_type && <span>{j.employment_type}</span>}
                  {j.seniority && <span>{j.seniority}</span>}
                  {salary(j) && <span>{salary(j)}</span>}
                </div>
                {j.match_reason && <p className="mt-3 text-sm">{j.match_reason}</p>}
                {(j.matched_skills?.length > 0 || j.missing_skills?.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(j.matched_skills ?? []).map((s) => (
                      <span key={`m-${s}`} className="rounded-md bg-accent px-2 py-0.5 text-xs text-primary">{s}</span>
                    ))}
                    {(j.missing_skills ?? []).map((s) => (
                      <span key={`x-${s}`} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-4">
                  {j.job_url && (
                    <a href={j.job_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      View job <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  {(j.job_id ?? j.id) && (
                    <>
                      <Link to="/jobs/$jobId/prep" params={{ jobId: (j.job_id ?? j.id)! }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Prepare for this job <GraduationCap className="size-3.5" />
                      </Link>
                      <Link to="/jobs/$jobId/referrals" params={{ jobId: (j.job_id ?? j.id)! }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Get referrals <Users className="size-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
