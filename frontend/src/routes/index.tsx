import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, Layers3, Play, Sparkles } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerAgent — Learning built around your next move" },
      {
        name: "description",
        content:
          "CareerAgent assembles personalized courses around your experience, goals, and next career move.",
      },
      { property: "og:title", content: "CareerAgent — Learning built around your next move" },
      {
        property: "og:description",
        content:
          "Personalized learning paths that turn your career goals into a clear, practical course plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="animate-ambient pointer-events-none absolute left-1/2 top-0 -z-10 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
          <div className="animate-fade-in max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" /> A learning path shaped around you
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl">
              Learn what moves your<br className="hidden sm:block" /> career <span className="text-primary">forward.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              CareerAgent reads where you are, understands where you want to go, and assembles a focused course journey to bridge the gap.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">Create your learning path <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          </div>

          <div className="relative mt-14 w-full max-w-4xl text-left">
            <div className="absolute -inset-1 rounded-xl bg-primary/15 blur-xl" />
            <div className="relative overflow-hidden rounded-lg border border-border bg-card/90 shadow-[var(--shadow-card)] backdrop-blur-xl">
              <div className="flex h-11 items-center border-b border-border px-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2 rounded-full bg-muted-foreground/30" /><span className="size-2 rounded-full bg-muted-foreground/30" /><span className="size-2 rounded-full bg-muted-foreground/30" />
                </div>
                <p className="flex-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">Your assembled course</p>
              </div>
              <div className="grid gap-0 md:grid-cols-[1fr_1.45fr]">
                <div className="border-b border-border p-6 md:border-b-0 md:border-r">
                  <p className="text-xs font-semibold text-primary">PATH 01</p>
                  <h2 className="mt-3 text-xl font-semibold">Machine Learning Engineer</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">A practical route from software foundations to production-ready ML systems.</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-[38%] bg-primary" /></div>
                    <span className="text-xs text-muted-foreground">38%</span>
                  </div>
                </div>
                <div className="space-y-2 p-4 sm:p-6">
                  {[
                    { icon: Check, title: "Python for applied ML", meta: "Completed", done: true },
                    { icon: Play, title: "Model evaluation in practice", meta: "Continue · 42 min", done: false },
                    { icon: Layers3, title: "Production ML systems", meta: "Next module", done: false },
                  ].map(({ icon: Icon, title, meta, done }) => (
                    <div key={title} className={`flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary/50 ${done ? "border-primary/20 bg-primary/5" : "border-border bg-background/35"}`}>
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${done ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}><Icon className="size-4" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{meta}</p></div>
                      <BookOpen className="size-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
