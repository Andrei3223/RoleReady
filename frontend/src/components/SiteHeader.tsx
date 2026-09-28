import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Orbit } from "lucide-react";
import { useState } from "react";
import { displayName, useAuth } from "@/lib/auth-context";

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
const active = { className: "text-foreground bg-accent" };

export function SiteHeader() {
  const { isAuthenticated, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    navigate({ to: "/login", replace: true });
  }

  const name = displayName(user);
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to={isAuthenticated ? "/jobs" : "/"} className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
            <Orbit className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-semibold sm:inline">RoleReady</span>
        </Link>
        {!loading &&
          (isAuthenticated ? (
            <nav className="flex items-center gap-1 overflow-x-auto">
              <Link to="/jobs" className={linkClass} activeProps={active}>Jobs</Link>
              <Link to="/courses" className={linkClass} activeProps={active}>Courses</Link>
              <Link to="/profile" className={linkClass} activeProps={active}>Profile</Link>
              <span className="ml-2 flex items-center gap-2" title={name}>
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {initials || "?"}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{name}</span>
              </span>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className={linkClass} aria-label="Log out">
                <LogOut className="size-4" />
              </button>
            </nav>
          ) : (
            <nav className="flex items-center gap-1">
              <Link to="/login" className={linkClass} activeProps={active}>Sign in</Link>
              <Link to="/signup" className={linkClass} activeProps={active}>Sign up</Link>
            </nav>
          ))}
      </div>
    </header>
  );
}
