import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, GraduationCap, Loader2, Mail, Send, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FormError } from "@/components/AuthCard";
import { buildGmailComposeUrl, buildMailtoUrl, fetchJobReferral, type JobReferral, type ReferralContact } from "@/api/referrals";

export const Route = createFileRoute("/jobs_/$jobId/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — CareerAgent" },
      { name: "description", content: "People who can refer you to this role, with a ready-to-edit outreach draft." },
      { property: "og:title", content: "Referrals — CareerAgent" },
      { property: "og:description", content: "People who can refer you to this role, with a ready-to-edit outreach draft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell>
      <ProtectedRoute>
        <ReferralsPage />
      </ProtectedRoute>
    </PageShell>
  ),
});

const TIER_LABELS: Record<string, string> = {
  alumni: "Alumni",
  ex_colleague: "Ex-colleague",
  same_team: "Same team",
  recruiter: "Recruiter",
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  found: "Email found",
  guessed: "Email guessed",
  not_found: "No email",
};


function ContactCard({ contact }: { contact: ReferralContact }) {
  const [subject, setSubject] = useState(contact.subject ?? "");
  const [body, setBody] = useState(contact.body ?? "");
  const [note, setNote] = useState(contact.linkedin_note ?? "");

  function openInGmail(useMailto = false) {
    const to = contact.email ?? "";
    if (!to) return;
    const url = useMailto
      ? buildMailtoUrl({ to, subject: subject.trim(), body: body.trim() })
      : buildGmailComposeUrl({ to, subject: subject.trim(), body: body.trim() });
    if (useMailto) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }


  return (
    <li className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{contact.contact_name}</h2>
          {contact.contact_headline && <p className="text-sm text-muted-foreground">{contact.contact_headline}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
            {TIER_LABELS[contact.tier] ?? contact.tier}
          </span>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Score {contact.score}
          </span>
        </div>
      </div>

      {contact.match_reasons.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How you're connected</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {contact.match_reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {contact.email && (
          <span className="flex items-center gap-1">
            <Mail className="size-3.5" /> {contact.email}
            <span className="text-xs">({EMAIL_STATUS_LABELS[contact.email_status] ?? contact.email_status})</span>
          </span>
        )}
        {contact.channel && <span>Channel: {contact.channel}</span>}
        {contact.status && <span>Draft status: {contact.status}</span>}
        {contact.contact_linkedin_url && (
          <a href={contact.contact_linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            LinkedIn profile <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email draft</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        {contact.linkedin_note != null && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">LinkedIn note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => openInGmail(false)}
          disabled={!contact.email || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-4" />
          Open in Gmail
        </button>
        <button
          type="button"
          onClick={() => openInGmail(true)}
          disabled={!contact.email || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" />
          Other email app
        </button>
        <span className="text-xs text-muted-foreground">Opens with your edited subject and message prefilled — you review and press send yourself.</span>
        {!contact.email && (
          <span className="text-xs text-muted-foreground">No email address for this contact, so the email draft isn't available.</span>
        )}
      </div>
    </li>
  );
}

function ReferralsPage() {
  const { jobId } = Route.useParams();
  const [referral, setReferral] = useState<JobReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchJobReferral(jobId)
      .then(setReferral)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load referrals."))
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All jobs
      </Link>
      <div className="mt-6">
        <FormError message={error} />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Finding people who can refer you...
          </div>
        ) : !referral ? (
          !error && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium">No referral data yet</p>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{referral.job_title ?? "Referrals"}</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {referral.company && <span>{referral.company}</span>}
                  <span className="flex items-center gap-1"><Users className="size-3.5" /> {referral.contacts_count} contact{referral.contacts_count === 1 ? "" : "s"}</span>
                </div>
              </div>
              <Link to="/jobs/$jobId/prep" params={{ jobId }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Interview prep <GraduationCap className="size-3.5" />
              </Link>
            </div>
            {referral.job_url && (
              <a href={referral.job_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View job <ExternalLink className="size-3.5" />
              </a>
            )}

            {referral.status === "no_contacts" || referral.contacts.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-medium">No contacts found for this job</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {referral.status === "not_generated"
                    ? "The referral search hasn't run for this job yet."
                    : "We searched your network but couldn't find anyone connected to this company."}
                </p>
              </div>
            ) : (
              <ul className="mt-8 space-y-4">
                {referral.contacts.map((c) => <ContactCard key={c.draft_id} contact={c} />)}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
