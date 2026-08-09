import Link from "next/link";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  adminAuditLogs,
  appearanceBackgrounds,
  cosmeticAssets,
  cosmetics
} from "../../db/schema";
import { requireAdmin } from "../../lib/admin";
import AssetUploadForm from "./AssetUploadForm";
import BatchAssetUploadForm from "./BatchAssetUploadForm";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MANAGED_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

type ExistingAsset = {
  id: string;
  cosmeticId: string;
  label: string;
  category: string;
  purpose: string;
  assetView: string | null;
  poseId: string | null;
  storageKey: string;
  url: string;
  sizeLabel: string;
  accessible: boolean;
};

type ExistingBackground = typeof appearanceBackgrounds.$inferSelect;

function formatAssetLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("appearance_backgrounds") ||
    message.includes("background_surface_mode") ||
    message.includes("accessible") ||
    message.includes("updated_by_email") ||
    message.includes("updated_at")
  ) {
    return "Asset access controls need the latest database migration. Run `npm run db:migrate`, then reload this page.";
  }

  return "Could not load assets.";
}

async function loadAssets() {
  try {
    const db = getDb();
    const [assets, backgrounds] = await Promise.all([
      db
        .select({
          asset: cosmeticAssets,
          cosmetic: {
            label: cosmetics.label,
            category: cosmetics.category
          }
        })
        .from(cosmeticAssets)
        .innerJoin(cosmetics, eq(cosmeticAssets.cosmeticId, cosmetics.id))
        .orderBy(desc(cosmeticAssets.createdAt))
        .limit(100),
      db
        .select()
        .from(appearanceBackgrounds)
        .orderBy(appearanceBackgrounds.sortOrder, appearanceBackgrounds.label)
    ]);

    return { assets, backgrounds, error: null };
  } catch (error) {
    return {
      assets: [],
      backgrounds: [],
      error: formatAssetLoadError(error)
    };
  }
}

function getRequiredText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`Enter a valid ${name}.`);
  }
  return value.trim();
}

async function saveBackgroundTheme(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const actorEmail = session.user?.email ?? "unknown";
  const id = getRequiredText(formData, "backgroundId", 80).toLowerCase();
  if (!MANAGED_ID_PATTERN.test(id)) throw new Error("Enter a valid background ID.");

  const background = getRequiredText(formData, "background", 500);
  if (/url\s*\(/i.test(background)) {
    throw new Error("Background CSS cannot load external URLs.");
  }

  const surfaceMode = formData.get("surfaceMode");
  if (surfaceMode !== "dark" && surfaceMode !== "light") {
    throw new Error("Choose a valid surface mode.");
  }

  const swatches = formData
    .getAll("swatch")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);
  const accessible = formData.get("accessible") !== "false";
  const sortOrderValue = Number(formData.get("sortOrder"));
  const sortOrder = Number.isFinite(sortOrderValue) ? Math.round(sortOrderValue) : 0;
  const db = getDb();

  const values = {
    id,
    label: getRequiredText(formData, "label", 120),
    description:
      typeof formData.get("description") === "string"
        ? String(formData.get("description")).trim().slice(0, 500)
        : "",
    background,
    foreground: getRequiredText(formData, "foreground", 120),
    accent: getRequiredText(formData, "accent", 120),
    border: getRequiredText(formData, "border", 160),
    swatches,
    surfaceMode,
    accessible,
    sortOrder,
    updatedByEmail: actorEmail,
    updatedAt: new Date()
  } as const;

  await db
    .insert(appearanceBackgrounds)
    .values(values)
    .onConflictDoUpdate({
      target: appearanceBackgrounds.id,
      set: values
    });

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "appearance_background.save",
    targetType: "appearance_background",
    targetId: id,
    metadata: { label: values.label, accessible, surfaceMode, sortOrder }
  });

  revalidatePath("/admin/assets");
  revalidatePath("/my-deskcat");
  revalidatePath("/");
}

async function saveBackgroundChanges(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const actorEmail = session.user?.email ?? "unknown";
  const backgroundIds = formData
    .getAll("backgroundId")
    .filter((value): value is string => typeof value === "string");
  const db = getDb();

  for (const backgroundId of backgroundIds) {
    if (!MANAGED_ID_PATTERN.test(backgroundId)) throw new Error("Choose a valid background.");
    const shouldDelete = formData.get(`delete:${backgroundId}`) === "on";
    const accessibleValue = formData.get(`accessible:${backgroundId}`);
    if (accessibleValue !== "true" && accessibleValue !== "false") {
      throw new Error("Choose a valid background access setting.");
    }

    if (shouldDelete) {
      await db.delete(appearanceBackgrounds).where(eq(appearanceBackgrounds.id, backgroundId));
    } else {
      await db
        .update(appearanceBackgrounds)
        .set({
          accessible: accessibleValue === "true",
          updatedByEmail: actorEmail,
          updatedAt: new Date()
        })
        .where(eq(appearanceBackgrounds.id, backgroundId));
    }

    await db.insert(adminAuditLogs).values({
      actorEmail,
      action: shouldDelete ? "appearance_background.delete" : "appearance_background.access.update",
      targetType: "appearance_background",
      targetId: backgroundId,
      metadata: { accessible: accessibleValue === "true" }
    });
  }

  revalidatePath("/admin/assets");
  revalidatePath("/my-deskcat");
  revalidatePath("/");
}

async function saveAssetChanges(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const actorEmail = session.user?.email ?? "unknown";
  const db = getDb();
  const assetIds = formData.getAll("assetId").filter((value): value is string => typeof value === "string");

  for (const assetId of assetIds) {
    const assetSource = formData.get(`assetSource:${assetId}`);
    const accessibleValue = formData.get(`accessible:${assetId}`);
    const shouldDelete = formData.get(`delete:${assetId}`) === "on";

    if (assetSource !== "database") {
      throw new Error("Choose a valid asset source.");
    }

    if (accessibleValue !== "true" && accessibleValue !== "false") {
      throw new Error("Choose a valid access setting.");
    }

    const accessible = accessibleValue === "true";

    if (!UUID_PATTERN.test(assetId)) {
      throw new Error("Choose a valid asset.");
    }

    if (shouldDelete) {
      const [asset] = await db
        .select()
        .from(cosmeticAssets)
        .where(eq(cosmeticAssets.id, assetId))
        .limit(1);

      if (!asset) {
        continue;
      }

      await del(asset.storageKey);

      await db.delete(cosmeticAssets).where(eq(cosmeticAssets.id, assetId));

      await db.insert(adminAuditLogs).values({
        actorEmail,
        action: "cosmetic_asset.delete",
        targetType: "cosmetic_asset",
        targetId: asset.id,
        metadata: {
          cosmeticId: asset.cosmeticId,
          storageKey: asset.storageKey
        }
      });

      continue;
    }

    const [asset] = await db
      .update(cosmeticAssets)
      .set({
        accessible,
        updatedByEmail: actorEmail,
        updatedAt: new Date()
      })
      .where(eq(cosmeticAssets.id, assetId))
      .returning();

    if (!asset) {
      throw new Error("Asset not found.");
    }

    await db.insert(adminAuditLogs).values({
      actorEmail,
      action: "cosmetic_asset.access.update",
      targetType: "cosmetic_asset",
      targetId: asset.id,
      metadata: {
        cosmeticId: asset.cosmeticId,
        accessible
      }
    });
  }

  revalidatePath("/admin/assets");
}

export default async function AdminAssetsPage() {
  await requireAdmin();
  const { assets, backgrounds, error } = await loadAssets();
  const existingAssets: ExistingAsset[] = assets.map(({ asset, cosmetic }) => ({
    id: asset.id,
    cosmeticId: asset.cosmeticId,
    label: cosmetic.label,
    category: cosmetic.category,
    purpose: asset.purpose,
    assetView: asset.assetView,
    poseId: asset.poseId,
    storageKey: asset.storageKey,
    url: asset.publicUrl,
    sizeLabel: `${asset.width} x ${asset.height} · ${Math.round(asset.byteSize / 1024)} KB`,
    accessible: asset.accessible
  }));

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
                Cosmetic Assets
              </h1>
              <p className="theme-text-secondary mt-2 text-sm">
                Upload PNG assets to Blob storage and record metadata in Postgres.
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

        <BatchAssetUploadForm />

        <BackgroundThemeForm />

        <details className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <summary className="theme-hover-highlight cursor-pointer list-none rounded-xl">
            <h2 className="theme-text-primary inline text-xl font-semibold">Single Upload</h2>
            <span className="theme-text-tertiary ml-3 text-sm">Open the original form</span>
          </summary>
          <div className="mt-5">
            <AssetUploadForm />
          </div>
        </details>

        <BackgroundTable backgrounds={backgrounds} error={error} />

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="theme-text-primary text-2xl font-semibold">Existing Assets</h2>
              <p className="theme-text-secondary mt-2 text-sm">
                Only uploaded, database-managed assets appear here. The former built-in entries are
                backed up under <code>deskcat-assets/built-in-archive</code> in the project folder.
              </p>
            </div>
            <span className="theme-text-tertiary text-sm">{existingAssets.length} assets</span>
          </div>

          {error ? (
            <p className="mt-5 rounded-2xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200">
              {error}
            </p>
          ) : existingAssets.length === 0 ? (
            <p className="theme-text-secondary mt-5 text-sm">No assets have been uploaded yet.</p>
          ) : (
            <form action={saveAssetChanges} className="mt-5 space-y-8">
              <AssetTable title="Uploaded assets" assets={existingAssets} />
              <button
                type="submit"
                className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition"
              >
                Save all asset changes
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function BackgroundThemeForm() {
  return (
    <details className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <summary className="theme-hover-highlight cursor-pointer list-none rounded-xl">
        <h2 className="theme-text-primary inline text-xl font-semibold">Create Background Theme</h2>
        <span className="theme-text-tertiary ml-3 text-sm">Database-managed</span>
      </summary>

      <form action={saveBackgroundTheme} className="mt-5 space-y-5">
        <p className="theme-text-secondary text-sm">
          Saving an existing ID updates that theme. Colors accept CSS color values; the background
          accepts colors and gradients but not external URLs.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <TextInput name="label" label="Theme name" required />
          <TextInput name="backgroundId" label="Theme ID" pattern="[a-z0-9][a-z0-9-]{0,79}" required />
          <TextInput name="description" label="Description" />
          <TextInput name="background" label="Background CSS" defaultValue="linear-gradient(180deg, #06080d 0%, #101725 100%)" required />
          <TextInput name="foreground" label="Foreground" defaultValue="#edf4ff" required />
          <TextInput name="accent" label="Accent" defaultValue="#7ab9e6" required />
          <TextInput name="border" label="Border" defaultValue="rgba(122, 185, 230, 0.34)" required />
          <label className="theme-text-secondary block text-sm font-medium">
            Surface mode
            <select name="surfaceMode" defaultValue="dark" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
              <option value="dark">Dark surfaces</option>
              <option value="light">Light surfaces</option>
            </select>
          </label>
          {Array.from({ length: 3 }, (_, index) => (
            <TextInput
              key={index}
              name="swatch"
              label={`Swatch ${index + 1}`}
              defaultValue={["#05070b", "#111827", "#7ab9e6"][index]}
            />
          ))}
          <TextInput name="sortOrder" label="Sort order" type="number" defaultValue="0" />
          <label className="theme-text-secondary block text-sm font-medium">
            App access
            <select name="accessible" defaultValue="true" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
              <option value="true">Accessible</option>
              <option value="false">Hidden</option>
            </select>
          </label>
        </div>

        <button type="submit" className="theme-button-primary theme-hover-highlight rounded-2xl border px-5 py-3 font-semibold transition">
          Save background theme
        </button>
      </form>
    </details>
  );
}

function TextInput({
  name,
  label,
  defaultValue,
  pattern,
  required = false,
  type = "text"
}: {
  name: string;
  label: string;
  defaultValue?: string;
  pattern?: string;
  required?: boolean;
  type?: "text" | "number";
}) {
  return (
    <label className="theme-text-secondary block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        pattern={pattern}
        required={required}
        className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function BackgroundTable({
  backgrounds,
  error
}: {
  backgrounds: ExistingBackground[];
  error: string | null;
}) {
  return (
    <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="theme-text-primary text-2xl font-semibold">Managed Backgrounds</h2>
          <p className="theme-text-secondary mt-2 text-sm">
            Only accessible themes are sent to the public appearance catalog.
          </p>
        </div>
        <span className="theme-text-tertiary text-sm">{backgrounds.length} themes</span>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>
      ) : backgrounds.length === 0 ? (
        <p className="theme-text-secondary mt-5 text-sm">No background themes have been created yet.</p>
      ) : (
        <form action={saveBackgroundChanges} className="mt-5 space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="theme-text-tertiary">
                <tr>
                  <th className="px-3 py-2">Theme</th>
                  <th className="px-3 py-2">Preview</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">App access</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {backgrounds.map((background) => (
                  <tr key={background.id} className="theme-subsurface">
                    <td className="rounded-l-2xl border-y border-l px-3 py-3">
                      <div className="theme-text-primary font-semibold">{background.label}</div>
                      <div className="theme-text-tertiary mt-1 text-xs">{background.id}</div>
                    </td>
                    <td className="border-y px-3 py-3">
                      <div className="h-14 w-32 rounded-xl border" style={{ background: background.background, borderColor: background.border }} />
                    </td>
                    <td className="border-y px-3 py-3 capitalize">{background.surfaceMode}</td>
                    <td className="border-y px-3 py-3">
                      <input type="hidden" name="backgroundId" value={background.id} />
                      <select
                        name={`accessible:${background.id}`}
                        defaultValue={background.accessible ? "true" : "false"}
                        className="theme-input min-w-[140px] rounded-xl border px-3 py-2"
                      >
                        <option value="true">Accessible</option>
                        <option value="false">Hidden</option>
                      </select>
                    </td>
                    <td className="rounded-r-2xl border-y border-r px-3 py-3">
                      <label className="theme-text-secondary flex items-center gap-2">
                        <input type="checkbox" name={`delete:${background.id}`} className="h-4 w-4 accent-red-400" />
                        Delete
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="submit" className="theme-button-primary theme-hover-highlight rounded-2xl border px-5 py-3 font-semibold transition">
            Save background changes
          </button>
        </form>
      )}
    </section>
  );
}

function AssetTable({
  title,
  assets
}: {
  title: string;
  assets: ExistingAsset[];
}) {
  return (
    <details className="theme-subsurface rounded-2xl border p-4">
      <summary className="theme-hover-highlight flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-2">
        <h3 className="theme-text-primary text-lg font-semibold">{title}</h3>
        <span className="theme-text-tertiary text-sm">{assets.length} assets</span>
      </summary>

      {assets.length === 0 ? (
        <p className="theme-text-secondary mt-3 text-sm">No assets in this category.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-separate border-spacing-y-3 text-left text-sm">
            <thead className="theme-text-tertiary">
              <tr>
                <th className="px-3 py-2 font-semibold">Asset</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Purpose</th>
                <th className="px-3 py-2 font-semibold">View</th>
                <th className="px-3 py-2 font-semibold">Pose</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">App access</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="theme-subsurface">
                  <td className="rounded-l-2xl border-y border-l px-3 py-3">
                    <div className="theme-text-primary font-semibold">{asset.label}</div>
                    <div className="theme-text-tertiary mt-1 text-xs">
                      {asset.cosmeticId} · uploaded
                    </div>
                    {asset.url ? (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="theme-link mt-1 block max-w-[260px] truncate text-xs"
                      >
                        {asset.storageKey}
                      </a>
                    ) : (
                      <div className="theme-text-tertiary mt-1 max-w-[260px] truncate text-xs">
                        {asset.storageKey}
                      </div>
                    )}
                  </td>
                  <td className="border-y px-3 py-3 capitalize">{asset.category}</td>
                  <td className="border-y px-3 py-3 capitalize">{asset.purpose}</td>
                  <td className="border-y px-3 py-3">
                    {asset.assetView === "threeQuarter" ? "3/4" : asset.assetView ?? "Default"}
                  </td>
                  <td className="border-y px-3 py-3 capitalize">{asset.poseId ?? "All"}</td>
                  <td className="border-y px-3 py-3">{asset.sizeLabel}</td>
                  <td className="border-y px-3 py-3">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input type="hidden" name={`assetSource:${asset.id}`} value="database" />
                    <select
                      name={`accessible:${asset.id}`}
                      defaultValue={asset.accessible ? "true" : "false"}
                      className="theme-input w-full min-w-[150px] rounded-xl border px-3 py-2"
                    >
                      <option value="true">Accessible</option>
                      <option value="false">Hidden</option>
                    </select>
                  </td>
                  <td className="rounded-r-2xl border-y border-r px-3 py-3">
                    <label className="theme-text-secondary flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`delete:${asset.id}`}
                        className="h-4 w-4 accent-red-400"
                      />
                      Delete
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
