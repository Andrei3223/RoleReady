import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchCourses, type Course } from "@/api/courses";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — CareerAgent" },
      { name: "description", content: "Courses recommended to close your skill gaps." },
      { property: "og:title", content: "Courses — CareerAgent" },
      { property: "og:description", content: "Courses recommended to close your skill gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <CoursesPage />
      </ProtectedRoute>
    </PageShell>
  ),
});

export function statusLabel(s?: string | null) {
  if (!s) return null;
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await fetchCourses());
    } catch (err) {
      console.error("[courses] loadCourses failed", err);
      setError(err instanceof Error ? err.message : "Could not load courses.");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCourses(); }, [loadCourses]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="mt-2 text-muted-foreground">Courses recommended to close your skill gaps.</p>
        </div>
        <Button variant="outline" onClick={() => void loadCourses()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Courses
        </Button>
      </div>

      <div className="mt-8">
        <FormError message={error} />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading courses...
          </div>
        ) : !error && courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-medium">No courses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Course recommendations will appear here soon.</p>
            <ol className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm">
              <li className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">1</span>
                <span className="text-muted-foreground">
                  Make sure you pressed <span className="font-medium text-foreground">Refresh Courses</span> on your{" "}
                  <Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">profile page</Link>.
                </span>
              </li>
              <li className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">2</span>
                <span className="text-muted-foreground">
                  Regeneration takes up to <span className="font-medium text-foreground">3 minutes</span> — come back shortly and press{" "}
                  <span className="font-medium text-foreground">Refresh Courses</span> here.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <ul className="space-y-4">
            {courses.map((c) => (
              <li key={c.course_id}>
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: c.course_id }}
                  className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{c.name}</h2>
                      {c.role && <p className="text-sm text-muted-foreground">{c.role}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status && (
                        <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-primary">{statusLabel(c.status)}</span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                  {c.description && <p className="mt-3 text-sm">{c.description}</p>}
                  <div className="mt-4">
                    <Progress value={c.progress_percent ?? 0} />
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{c.progress_percent ?? 0}% complete</span>
                      {c.total_modules != null && <span>{c.completed_modules ?? 0}/{c.total_modules} modules</span>}
                      {c.jobs_analyzed != null && <span>{c.jobs_analyzed} jobs analyzed</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
