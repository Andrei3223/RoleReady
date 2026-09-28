export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto w-full max-w-6xl px-4 text-sm text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} CareerAgent — learning assembled around your next move.
      </div>
    </footer>
  );
}
