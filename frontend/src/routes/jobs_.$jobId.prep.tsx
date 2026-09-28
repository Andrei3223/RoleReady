import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, GraduationCap, Lightbulb, Loader2, MessageSquareQuote, Target, Dumbbell } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { fetchJobCourse, type JobCourse } from "@/api/courses";

export const Route = createFileRoute("/jobs_/$jobId/prep")({
  head: () => ({
    meta: [
      { title: "Interview preparation — CareerAgent" },
      { name: "description", content: "Preparation course tailored to a specific vacancy." },
      { property: "og:title", content: "Interview preparation — CareerAgent" },
      { property: "og:description", content: "Preparation course tailored to a specific vacancy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <JobPrep />
      </ProtectedRoute>
    </PageShell>
  ),
});

type Rec = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function list(prep: JobCourse, key: string): Rec[] {
  const v = prep[key];
  return Array.isArray(v) ? (v as Rec[]) : [];
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="text-primary">{icon}</span> {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function LinkRow({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline break-all">
      {url} <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

function JobPrep() {
  const { jobId } = Route.useParams();
  const [prep, setPrep] = useState<JobCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchJobCourse(jobId)
      .then(setPrep)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load preparation."))
      .finally(() => setLoading(false));
  }, [jobId]);

  const courses = prep ? list(prep, "courses") : [];
  const skillGaps = prep ? list(prep, "skill_gaps") : [];
  const practice = prep ? list(prep, "practice") : [];
  const insights = prep ? list(prep, "interview_insights") : [];
  const questions = prep ? list(prep, "likely_questions") : [];
  const plan = prep ? list(prep, "plan") : [];
  const planMarkdown = prep ? str(prep["plan_markdown"]) : null;
  const matchScore = typeof prep?.["match_score"] === "number" ? (prep["match_score"] as number) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      <div className="mt-6">
        <FormError message={error} />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading preparation...
          </div>
        ) : !prep ? (
          !error && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium">No preparation available yet</p>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Interview preparation</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {prep.prep_role_type && <span>Role type: {prep.prep_role_type}</span>}
                  {prep.prep_status && <span>Status: {prep.prep_status}</span>}
                  {str(prep["prep_data_quality"]) && <span>Data: {str(prep["prep_data_quality"])}</span>}
                </div>
              </div>
              {matchScore != null && (
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">{matchScore}% match</span>
              )}
            </div>

            {courses.length > 0 && (
              <Section icon={<GraduationCap className="size-5" />} title="Recommended courses">
                {courses.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm" style={{ boxShadow: "var(--shadow-card)" }}>
                    <p className="font-medium">{str(c["title"]) ?? "Course"}</p>
                    {str(c["why"]) && <p className="mt-1 text-muted-foreground">{str(c["why"])}</p>}
                    <LinkRow url={str(c["url"])} />
                  </div>
                ))}
              </Section>
            )}

            {skillGaps.length > 0 && (
              <Section icon={<Target className="size-5" />} title="Skill gaps">
                {skillGaps.map((g, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <p className="font-medium">{str(g["skill"]) ?? str(g["title"]) ?? "Skill"}</p>
                    {str(g["why"]) && <p className="mt-1 text-muted-foreground">{str(g["why"])}</p>}
                  </div>
                ))}
              </Section>
            )}

            {practice.length > 0 && (
              <Section icon={<Dumbbell className="size-5" />} title="Practice">
                {practice.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{str(p["title"]) ?? "Exercise"}</p>
                      {str(p["type"]) && (
                        <span className="rounded-md bg-accent px-2 py-0.5 text-xs text-primary">{str(p["type"])}</span>
                      )}
                    </div>
                    {str(p["why"]) && <p className="mt-1 text-muted-foreground">{str(p["why"])}</p>}
                    <LinkRow url={str(p["url"])} />
                  </div>
                ))}
              </Section>
            )}

            {questions.length > 0 && (
              <Section icon={<MessageSquareQuote className="size-5" />} title="Likely questions">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <p className="font-medium">{str(q["question"]) ?? "Question"}</p>
                    {str(q["answer_hint"]) && <p className="mt-1 text-muted-foreground">{str(q["answer_hint"])}</p>}
                    {str(q["source"]) && <p className="mt-1 text-xs text-muted-foreground">Source: {str(q["source"])}</p>}
                  </div>
                ))}
              </Section>
            )}

            {insights.length > 0 && (
              <Section icon={<Lightbulb className="size-5" />} title="Interview insights">
                {insights.map((ins, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <p>{str(ins["insight"]) ?? str(ins["title"]) ?? JSON.stringify(ins)}</p>
                    <LinkRow url={str(ins["source_url"]) ?? str(ins["url"])} />
                  </div>
                ))}
              </Section>
            )}

            {plan.length > 0 && (
              <Section icon={<CalendarDays className="size-5" />} title="Preparation plan">
                {plan.map((d, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 text-sm">
                    <p className="font-medium">
                      {typeof d["day"] === "number" ? `Day ${d["day"]}` : `Step ${i + 1}`}
                      {str(d["focus"]) ? ` — ${str(d["focus"])}` : ""}
                    </p>
                    {Array.isArray(d["tasks"]) && (
                      <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                        {(d["tasks"] as unknown[]).map((t, j) => <li key={j}>{String(t)}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </Section>
            )}

            {planMarkdown && (
              <Section icon={<CalendarDays className="size-5" />} title="Full plan">
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm">{planMarkdown}</pre>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
