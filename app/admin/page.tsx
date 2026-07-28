import Link from "next/link";
import donationProgress from "../data/donationProgress.json";
import { requireAdmin } from "../lib/admin";
import { isDeskCatAnchorEditorEnabled } from "../lib/deskcatAnchorEditor.server";
import {
  DESKCAT_COSMETIC_CATEGORIES,
  DESKCAT_COSMETIC_OPTIONS
} from "../lib/deskcatSprite";

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

function getConfiguredLabel(value: string | undefined) {
  return value && value.length > 0 ? "Configured" : "Missing";
}

export default async function AdminPage() {
  const session = await requireAdmin();
  const editorEnabled = isDeskCatAnchorEditorEnabled();
  const donationPercent =
    donationProgress.goalAmount > 0
      ? Math.min(100, Math.round((donationProgress.currentAmount / donationProgress.goalAmount) * 100))
      : 0;

  const envRows = [
    ["Google OAuth", process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "Configured" : "Missing"],
    ["NextAuth secret", getConfiguredLabel(process.env.NEXTAUTH_SECRET)],
    ["Admin email", getConfiguredLabel(process.env.DESKCAT_ADMIN_EMAIL)],
    ["Database", getConfiguredLabel(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)],
    ["Blob storage", getConfiguredLabel(process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_OIDC_TOKEN)],
    ["Stripe secret", getConfiguredLabel(process.env.STRIPE_SECRET_KEY)],
    ["Anchor editor token", getConfiguredLabel(process.env.DESKCAT_ANCHOR_EDITOR_TOKEN)]
  ];

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
                DeskCat Admin
              </h1>
              <p className="theme-text-secondary mt-2 text-sm">
                Signed in as {session.user?.email}. This page is read-only.
              </p>
            </div>

            <Link
              href="/"
              className="theme-button-secondary theme-hover-highlight inline-flex w-fit items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition"
            >
              Back to DeskCat
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Donation progress"
            value={`${donationPercent}%`}
            detail={`${formatCurrency(donationProgress.currentAmount, donationProgress.currencyCode)} / ${formatCurrency(donationProgress.goalAmount, donationProgress.currencyCode)}`}
          />
          <StatusCard
            label="Cosmetics"
            value={String(DESKCAT_COSMETIC_OPTIONS.length)}
            detail={`${DESKCAT_COSMETIC_CATEGORIES.length} categories`}
          />
          <StatusCard
            label="Anchor editor"
            value={editorEnabled ? "Enabled" : "Disabled"}
            detail={process.env.NODE_ENV === "production" ? "Production rules" : "Local/dev rules"}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="theme-surface rounded-[28px] border p-6 backdrop-blur">
            <h2 className="theme-text-primary text-2xl font-semibold">Environment</h2>
            <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {envRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="theme-text-secondary">{label}</span>
                  <span className="theme-text-primary font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="theme-surface rounded-[28px] border p-6 backdrop-blur">
            <h2 className="theme-text-primary text-2xl font-semibold">Cosmetics</h2>
            <div className="mt-5 grid gap-3">
              {DESKCAT_COSMETIC_OPTIONS.map((cosmetic) => (
                <div
                  key={cosmetic.id}
                  className="theme-subsurface rounded-2xl border px-4 py-3 text-sm"
                >
                  <div className="theme-text-primary font-semibold">{cosmetic.label}</div>
                  <div className="theme-text-secondary mt-1">
                    {cosmetic.id} · {cosmetic.category} · {cosmetic.anchorSlot}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Tools</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {editorEnabled ? (
              <Link
                href="/admin/editor"
                className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
              >
                Open anchor editor
              </Link>
            ) : (
              <Link
                href="/admin/editor"
                className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
              >
                Open admin editor
              </Link>
            )}
            <Link
              href="/admin/assets"
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Manage assets
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
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
