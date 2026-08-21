import Link from "next/link";
import { requireAdmin } from "../../lib/admin";
import { validateReflectionTree } from "../../lib/reflectionTree";
import {
  loadPublishedReflectionTree,
  loadReflectionTreeRevisions
} from "../../lib/reflectionTree.server";

export const dynamic = "force-dynamic";

function formatTime(value: Date | string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles"
  }).format(new Date(value));
}

export default async function AdminReflectionsPage() {
  await requireAdmin();

  const published = await loadPublishedReflectionTree();
  const revisions = await loadReflectionTreeRevisions();
  const report = validateReflectionTree(published.tree);

  const nodes = Object.values(published.tree.nodes);
  const answerCount = nodes.reduce((total, node) => total + node.answers.length, 0);
  const taggedCount = nodes.reduce(
    (total, node) =>
      total +
      node.answers.filter((answer) => answer.outcome || answer.area || answer.recordAs || answer.action)
        .length,
    0
  );

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <p className="theme-text-tertiary text-xs font-semibold uppercase tracking-[0.22em]">
            Private Admin
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="theme-text-primary text-4xl font-semibold tracking-tight">
                Reflections
              </h1>
              <p className="theme-text-secondary mt-2 text-sm">
                The question tree behind the reflection flow writers see after a session.
              </p>
            </div>

            <Link
              href="/admin"
              className="theme-button-secondary theme-hover-highlight inline-flex w-fit items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition"
            >
              Back to admin
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Serving"
            value={published.source === "database" ? `Revision ${published.revision}` : "Bundled tree"}
            detail={
              published.source === "database"
                ? `Published ${formatTime(published.publishedAt)}`
                : "No published revision in the database yet"
            }
          />
          <StatusCard
            label="Tree"
            value={`${nodes.length} nodes`}
            detail={`${answerCount} answers, ${taggedCount} carrying tags`}
          />
          <StatusCard
            label="Validation"
            value={report.errors.length > 0 ? `${report.errors.length} errors` : "Passing"}
            detail={
              report.warnings.length > 0
                ? `${report.warnings.length} warning${report.warnings.length === 1 ? "" : "s"}`
                : "No warnings"
            }
          />
        </section>

        {(report.errors.length > 0 || report.warnings.length > 0) && (
          <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
            <h2 className="theme-text-primary text-2xl font-semibold">Validation</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {report.errors.map((message) => (
                <li key={message} className="theme-text-primary font-medium">
                  Error: {message}
                </li>
              ))}
              {report.warnings.map((message) => (
                <li key={message} className="theme-text-secondary">
                  Warning: {message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Revisions</h2>

          {revisions.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="theme-text-tertiary grid grid-cols-[80px_110px_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span>Revision</span>
                <span>Status</span>
                <span>Label</span>
                <span>Published</span>
              </div>
              <div className="divide-y divide-white/10">
                {revisions.map((revision) => (
                  <div
                    key={revision.revision}
                    className="grid grid-cols-[80px_110px_minmax(0,1fr)_minmax(0,1fr)] gap-4 px-4 py-3 text-sm"
                  >
                    <span className="theme-text-primary font-semibold">{revision.revision}</span>
                    <span className="theme-text-secondary">{revision.status}</span>
                    <span className="theme-text-secondary">{revision.label || "—"}</span>
                    <span className="theme-text-secondary">{formatTime(revision.publishedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="theme-text-secondary mt-5 rounded-2xl border border-white/10 px-4 py-5 text-sm">
              No revisions stored yet, so the tree compiled into the build is being served. Run{" "}
              <code>npm run reflection:seed -- --apply</code> to copy it into the database and make it
              editable without a redeploy.
            </p>
          )}
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Editing</h2>
          <p className="theme-text-secondary mt-2 text-sm">
            The editor is not built yet. It will offer a node outline, an inspector for each question
            and its answers, validation before publishing, and a playtest that shows what a run through
            the draft would record.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="theme-surface rounded-[28px] border p-5 backdrop-blur">
      <div className="theme-text-tertiary text-xs font-semibold uppercase tracking-[0.2em]">
        {label}
      </div>
      <div className="theme-text-primary mt-3 text-3xl font-semibold">{value}</div>
      <div className="theme-text-secondary mt-2 text-sm">{detail}</div>
    </div>
  );
}
