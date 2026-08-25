import Link from "next/link";
import { revalidatePath } from "next/cache";
import { asc, ne } from "drizzle-orm";
import { getDb } from "../db";
import { cosmetics } from "../db/schema";
import { requireAdmin } from "../lib/admin";
import { loadPublicAppearanceCatalog } from "../lib/appearanceCatalog.server";
import { EMPTY_APPEARANCE_CATALOG } from "../lib/appearanceCatalog";
import {
  loadDonationProgress,
  saveDonationProgress
} from "../lib/donations.server";
import {
  isConstructionScreenEnabled,
  isDonationMeterEnabled,
  setConstructionScreenEnabled,
  setDonationMeterEnabled
} from "../lib/featureFlags.server";
import {
  DESKCAT_COSMETIC_CATEGORIES
} from "../lib/deskcatSprite";
import type { DonationProgressSource, DonationReward } from "../lib/donations";
import { loadRecentDonations } from "../lib/donation-payments.server";

const DONATION_REWARD_ROW_COUNT = 3;

async function loadManagedCosmetics() {
  try {
    return await getDb()
      .select({ id: cosmetics.id, label: cosmetics.label, status: cosmetics.status })
      .from(cosmetics)
      .where(ne(cosmetics.status, "retired"))
      .orderBy(asc(cosmetics.sortOrder), asc(cosmetics.label));
  } catch {
    return [];
  }
}

async function loadPublicCatalog() {
  try {
    return await loadPublicAppearanceCatalog();
  } catch {
    return EMPTY_APPEARANCE_CATALOG;
  }
}

/**
 * A reward preview resolves through the public catalog, so a cosmetic that is
 * missing from it renders an empty tooltip no matter what the reward points at.
 */
function describeRewardCosmetic(
  cosmetic: { label: string; status: string },
  isInPublicCatalog: boolean
) {
  if (!isInPublicCatalog) return `${cosmetic.label} — no accessible asset, will not preview`;
  return cosmetic.status === "published"
    ? cosmetic.label
    : `${cosmetic.label} — coming soon`;
}

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

function formatDonationAmount(amountCents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode
  }).format(amountCents / 100);
}

function formatDonationTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles"
  }).format(value);
}

async function updateConstructionScreen(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const enabled = formData.get("enabled") === "true";

  await setConstructionScreenEnabled(enabled, session.user?.email ?? "unknown");
  revalidatePath("/");
  revalidatePath("/admin");
}

async function updateDonationMeter(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const enabled = formData.get("enabled") === "true";

  await setDonationMeterEnabled(enabled, session.user?.email ?? "unknown");
  revalidatePath("/");
  revalidatePath("/admin");
}

function parseAmount(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
}

function parseDonationRewards(formData: FormData): DonationReward[] {
  const rewards: DonationReward[] = [];

  for (let index = 0; index < DONATION_REWARD_ROW_COUNT; index += 1) {
    const label = formData.get(`rewardLabel${index}`);
    const amount = parseAmount(formData.get(`rewardAmount${index}`));
    const cosmeticId = formData.get(`rewardCosmeticId${index}`);
    const highlight = formData.get(`rewardHighlight${index}`) === "on";

    if (typeof label !== "string" || label.trim().length === 0 || amount <= 0) {
      continue;
    }

    rewards.push({
      label: label.trim(),
      amount,
      highlight,
      cosmeticId:
        typeof cosmeticId === "string" && cosmeticId.trim().length > 0
          ? (cosmeticId.trim() as DonationReward["cosmeticId"])
          : undefined
    });
  }

  return rewards;
}

async function updateDonationProgress(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const title = formData.get("title");
  const actionLabel = formData.get("actionLabel");
  const currencyCode = formData.get("currencyCode");

  const input: DonationProgressSource = {
    title: typeof title === "string" && title.trim().length > 0 ? title.trim() : "Buy DeskCat food",
    actionLabel:
      typeof actionLabel === "string" && actionLabel.trim().length > 0
        ? actionLabel.trim()
        : "Donate",
    currencyCode:
      typeof currencyCode === "string" && currencyCode.trim().length === 3
        ? currencyCode.trim().toUpperCase()
        : "USD",
    goalAmount: Math.max(1, parseAmount(formData.get("goalAmount"))),
    currentAmount: parseAmount(formData.get("currentAmount")),
    rewards: parseDonationRewards(formData)
  };

  await saveDonationProgress(input, session.user?.email ?? "unknown");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/donations/progress");
}

export default async function AdminPage() {
  const session = await requireAdmin();
  const constructionScreenEnabled = await isConstructionScreenEnabled();
  const donationMeterEnabled = await isDonationMeterEnabled();
  const donationProgress = await loadDonationProgress();
  const recentDonations = await loadRecentDonations();
  const managedCosmetics = await loadManagedCosmetics();
  const publicCatalog = await loadPublicCatalog();
  const publicCosmeticIds = new Set(publicCatalog.cosmetics.map((cosmetic) => cosmetic.id));
  const donationPercent =
    donationProgress.goalAmount > 0
      ? Math.min(100, Math.round((donationProgress.currentAmount / donationProgress.goalAmount) * 100))
      : 0;

  const envRows = [
    ["Google OAuth", process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "Configured" : "Missing"],
    ["NextAuth secret", getConfiguredLabel(process.env.NEXTAUTH_SECRET)],
    ["Admin email", getConfiguredLabel(process.env.DESKCAT_ADMIN_EMAIL)],
    ["Database", getConfiguredLabel(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)],
    ["Blob storage", getConfiguredLabel(process.env.BLOB_STORE_ID ?? process.env.BLOB_READ_WRITE_TOKEN)],
    ["Stripe secret", getConfiguredLabel(process.env.STRIPE_SECRET_KEY)],
    ["Stripe webhook", getConfiguredLabel(process.env.STRIPE_WEBHOOK_SECRET)]
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
                Signed in as {session.user?.email}.
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Donation progress"
            value={`${donationPercent}%`}
            detail={`${formatCurrency(donationProgress.currentAmount, donationProgress.currencyCode)} / ${formatCurrency(donationProgress.goalAmount, donationProgress.currencyCode)}`}
          />
          <StatusCard
            label="Cosmetics"
            value={String(managedCosmetics.length)}
            detail={`${DESKCAT_COSMETIC_CATEGORIES.length} categories`}
          />
          <StatusCard
            label="Construction"
            value={constructionScreenEnabled ? "Active" : "Inactive"}
            detail={constructionScreenEnabled ? "Homepage is hidden" : "Homepage is public"}
          />
          <StatusCard
            label="Donation meter"
            value={donationMeterEnabled ? "Visible" : "Hidden"}
            detail={donationMeterEnabled ? "Shown on the homepage" : "Hidden from the homepage"}
          />
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Construction Screen</h2>
          <p className="theme-text-secondary mt-2 text-sm">
            Control whether visitors see the construction screen or the DeskCat app homepage.
          </p>
          <form action={updateConstructionScreen} className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              name="enabled"
              value="true"
              disabled={constructionScreenEnabled}
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Activate construction screen
            </button>
            <button
              type="submit"
              name="enabled"
              value="false"
              disabled={!constructionScreenEnabled}
              className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deactivate construction screen
            </button>
          </form>
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Donation Meter</h2>
          <p className="theme-text-secondary mt-2 text-sm">
            Control whether the donation meter appears on the DeskCat app homepage. Hiding it
            leaves the settings below untouched.
          </p>
          <form action={updateDonationMeter} className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              name="enabled"
              value="false"
              disabled={!donationMeterEnabled}
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hide donation meter
            </button>
            <button
              type="submit"
              name="enabled"
              value="true"
              disabled={donationMeterEnabled}
              className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Show donation meter
            </button>
          </form>
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Donation Progress</h2>
          <form action={updateDonationProgress} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="title" label="Title" defaultValue={donationProgress.title} />
              <TextField
                name="actionLabel"
                label="Button label"
                defaultValue={donationProgress.actionLabel}
              />
              <TextField
                name="currencyCode"
                label="Currency"
                defaultValue={donationProgress.currencyCode}
                maxLength={3}
              />
              <NumberField
                name="currentAmount"
                label="Starting/current amount"
                defaultValue={donationProgress.currentAmount}
              />
              <NumberField
                name="goalAmount"
                label="Goal amount"
                defaultValue={donationProgress.goalAmount}
              />
            </div>

            <div>
              <h3 className="theme-text-primary text-lg font-semibold">Rewards</h3>
              <div className="mt-3 grid gap-3">
                {Array.from({ length: DONATION_REWARD_ROW_COUNT }).map((_, index) => {
                  const reward = donationProgress.rewards[index];
                  return (
                    <div
                      key={index}
                      className="theme-subsurface grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_120px_180px_auto]"
                    >
                      <TextField
                        name={`rewardLabel${index}`}
                        label={`Reward ${index + 1}`}
                        defaultValue={reward?.label ?? ""}
                      />
                      <NumberField
                        name={`rewardAmount${index}`}
                        label="Amount"
                        defaultValue={reward?.amount ?? ""}
                      />
                      <label className="theme-text-secondary block text-sm font-medium">
                        Cosmetic
                        <select
                          name={`rewardCosmeticId${index}`}
                          defaultValue={reward?.cosmeticId ?? ""}
                          className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
                        >
                          <option value="">None</option>
                          {managedCosmetics.map((cosmetic) => (
                            <option key={cosmetic.id} value={cosmetic.id}>
                              {describeRewardCosmetic(
                                cosmetic,
                                publicCosmeticIds.has(cosmetic.id)
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="theme-text-secondary flex items-end gap-2 pb-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          name={`rewardHighlight${index}`}
                          defaultChecked={reward?.highlight === true}
                          className="h-4 w-4 accent-sky-300"
                        />
                        Highlight
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Save donation settings
            </button>
          </form>
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Donation Log</h2>
          <p className="theme-text-secondary mt-2 text-sm">
            Most recent confirmed donations. Times are shown in Pacific time.
          </p>

          {recentDonations.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="theme-text-tertiary grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span>Amount</span>
                <span>Time</span>
              </div>
              <div className="divide-y divide-white/10">
                {recentDonations.map((donation) => (
                  <div
                    key={donation.checkoutSessionId}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 px-4 py-3 text-sm"
                  >
                    <span className="theme-text-primary font-semibold">
                      {formatDonationAmount(donation.amountCents, donation.currencyCode)}
                    </span>
                    <time
                      dateTime={donation.receivedAt.toISOString()}
                      className="theme-text-secondary"
                    >
                      {formatDonationTime(donation.receivedAt)}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="theme-text-secondary mt-5 rounded-2xl border border-white/10 px-4 py-5 text-sm">
              No confirmed donations yet.
            </p>
          )}
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Environment</h2>
          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {envRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="theme-text-secondary">{label}</span>
                <span className="theme-text-primary font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <h2 className="theme-text-primary text-2xl font-semibold">Tools</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/editor"
              className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Open editor
            </Link>
            <Link
              href="/admin/assets"
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Manage assets
            </Link>
            <Link
              href="/admin/reflections"
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Edit reflections
            </Link>
            <Link
              href="/admin/sources"
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Sources
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  maxLength
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  maxLength?: number;
}) {
  return (
    <label className="theme-text-secondary block text-sm font-medium">
      {label}
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function NumberField({
  name,
  label,
  defaultValue
}: {
  name: string;
  label: string;
  defaultValue: string | number;
}) {
  return (
    <label className="theme-text-secondary block text-sm font-medium">
      {label}
      <input
        name={name}
        type="number"
        min="0"
        step="1"
        defaultValue={defaultValue}
        className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
      />
    </label>
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
