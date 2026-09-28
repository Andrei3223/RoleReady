import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchCourse, recalcCourse, saveModuleProgress, type Course } from "@/api/courses";

export const Route = createFileRoute("/courses_/$courseId")({
  head: () => ({
    meta: [
      { title: "Course — CareerAgent" },
      { name: "description", content: "Your course modules, resources and progress." },
      { property: "og:title", content: "Course — CareerAgent" },
      { property: "og:description", content: "Your course modules, resources and progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <CourseDetail />
      </ProtectedRoute>
    </PageShell>
  ),
});

function label(s?: string | null) {
  return s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : null;
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourse(await fetchCourse(courseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load course.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  const setProgress = async (module_id: string, pct: number) => {
    if (!course) return;
    setSaving(module_id);
    setError(null);
    try {
      const r = await saveModuleProgress(course.course_id, module_id, pct);
      setCourse((c) =>
        c ? recalcCourse({ ...c, modules: (c.modules ?? []).map((m) => (m.module_id === module_id ? { ...m, ...r } : m)) }) : c,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save progress.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All courses
      </Link>
      <div className="mt-6">
        <FormError message={error} />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading course...
          </div>
        ) : !course ? (
          !error && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium">No course available</p>
            </div>
          )
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
            {course.role && <p className="mt-1 text-muted-foreground">{course.role}</p>}
            {course.description && <p className="mt-4">{course.description}</p>}
            <div className="mt-6">
              <Progress value={course.progress_percent ?? 0} />
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                <span>{course.progress_percent ?? 0}% complete</span>
                <span>{course.completed_modules ?? 0}/{course.total_modules ?? (course.modules ?? []).length} modules</span>
                {course.status && <span>{label(course.status)}</span>}
              </div>
            </div>

            {(course.modules ?? []).length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">No modules yet.</p>
            ) : (
              <ol className="mt-8 space-y-4">
                {(course.modules ?? []).map((m) => {
                  const pct = m.progress_percent ?? 0;
                  const done = pct >= 100;
                  return (
                    <li key={m.module_id} className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{m.order_index}. {m.title}</h2>
                          {m.skill_name && <p className="text-sm text-muted-foreground">{m.skill_name}</p>}
                        </div>
                        <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">{pct}%</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        {m.importance_score != null && <span>Importance {m.importance_score}</span>}
                        {m.market_demand_percent != null && <span>{m.market_demand_percent}% market demand</span>}
                        {m.trend_percent != null && <span>Trend {m.trend_percent > 0 ? "+" : ""}{m.trend_percent}%</span>}
                      </div>
                      {m.description && <p className="mt-3 text-sm">{m.description}</p>}
                      {m.content && (
                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer font-medium">Module content</summary>
                          <p className="mt-2 whitespace-pre-wrap">{m.content}</p>
                        </details>
                      )}
                      {(m.resources ?? []).filter((r) => r.url).length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {(m.resources ?? []).filter((r) => r.url).map((r, i) => (
                            <li key={`${r.url}-${i}`}>
                              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                                {r.title || r.url} <ExternalLink className="size-3.5" />
                              </a>
                              {r.source && <span className="ml-2 text-xs text-muted-foreground">{r.source}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {pct === 0 && (
                          <Button size="sm" variant="outline" disabled={saving === m.module_id} onClick={() => void setProgress(m.module_id, 50)}>
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant={done ? "outline" : "default"} disabled={saving === m.module_id} onClick={() => void setProgress(m.module_id, done ? 0 : 100)}>
                          {saving === m.module_id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          {done ? "Mark as not done" : "Mark complete"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
