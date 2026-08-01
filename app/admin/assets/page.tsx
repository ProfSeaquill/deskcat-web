import Link from "next/link";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { adminAuditLogs, cosmeticAssets, featureFlags } from "../../db/schema";
import { requireAdmin } from "../../lib/admin";
import { BACKGROUND_OPTIONS } from "../../lib/appearance";
import { DESKCAT_COSMETIC_OPTIONS } from "../../lib/deskcatSprite";
import AssetUploadForm from "./AssetUploadForm";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExistingAsset =
  | {
      category: "accessory";
      source: "built-in";
      id: string;
      cosmeticId: string;
      label: string;
      role: string;
      storageKey: string;
      url: string;
      sizeLabel: string;
      accessible: boolean;
    }
  | {
      category: "accessory";
      source: "database";
      id: string;
      cosmeticId: string;
      label: string;
      role: string;
      storageKey: string;
      url: string;
      sizeLabel: string;
      accessible: boolean;
    }
  | {
      category: "background";
      source: "built-in";
      id: string;
      cosmeticId: string;
      label: string;
      role: string;
      storageKey: string;
      url: string;
      sizeLabel: string;
      accessible: boolean;
    };

function assetFlagId(assetId: string) {
  return `asset:${assetId}`;
}

function loadBuiltInAccessories(accessOverrides: Map<string, boolean>): ExistingAsset[] {
  return DESKCAT_COSMETIC_OPTIONS.flatMap((cosmetic) => {
    const assetsByUrl = new Map<
      string,
      {
        roles: string[];
        width: number;
        height: number;
      }
    >();

    function addAsset(role: string, asset: { src: string; width: number; height: number }) {
      const existing = assetsByUrl.get(asset.src);
      if (existing) {
        existing.roles.push(role);
        return;
      }

      assetsByUrl.set(asset.src, {
        roles: [role],
        width: asset.width,
        height: asset.height
      });
    }

    addAsset("preview", cosmetic.previewSrc);
    addAsset("render", cosmetic.renderSrc);

    Object.entries(cosmetic.renderSrcByView ?? {}).forEach(([view, asset]) => {
      if (asset) addAsset(`render · ${view}`, asset);
    });

    Object.entries(cosmetic.poseRenderSrc ?? {}).forEach(([pose, asset]) => {
      if (asset) addAsset(`pose · ${pose}`, asset);
    });

    return Array.from(assetsByUrl.entries()).map(([url, asset], index) => ({
      category: "accessory" as const,
      source: "built-in" as const,
      id: `built-in:${cosmetic.id}:${index}`,
      cosmeticId: cosmetic.id,
      label: cosmetic.label,
      role: asset.roles.join(", "),
      storageKey: url,
      url,
      sizeLabel: `${asset.width} x ${asset.height} · bundled file`,
      accessible: accessOverrides.get(`built-in:${cosmetic.id}:${index}`) ?? true
    }));
  });
}

function loadBuiltInBackgrounds(accessOverrides: Map<string, boolean>): ExistingAsset[] {
  return BACKGROUND_OPTIONS.map((background) => ({
    category: "background" as const,
    source: "built-in" as const,
    id: `background:${background.id}`,
    cosmeticId: background.id,
    label: background.label,
    role: "theme background",
    storageKey: background.background,
    url: "",
    sizeLabel: "CSS theme",
    accessible: accessOverrides.get(`background:${background.id}`) ?? true
  }));
}

function loadBuiltInAssetIds() {
  const emptyOverrides = new Map<string, boolean>();
  return [
    ...loadBuiltInBackgrounds(emptyOverrides),
    ...loadBuiltInAccessories(emptyOverrides)
  ].map((asset) => asset.id);
}

function isBuiltInAssetId(value: string) {
  return loadBuiltInAssetIds().includes(value);
}

function formatAssetLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("accessible") ||
    message.includes("updated_by_email") ||
    message.includes("updated_at")
  ) {
    return "Asset access controls need the latest database migration. Run `npm run db:migrate`, then reload this page.";
  }

  return "Could not load assets.";
}

async function loadAssets(builtInAssetIds: string[]) {
  try {
    const db = getDb();
    const assets = await getDb()
      .select()
      .from(cosmeticAssets)
      .orderBy(desc(cosmeticAssets.createdAt))
      .limit(100);
    const flags =
      builtInAssetIds.length > 0
        ? await db
            .select({
              id: featureFlags.id,
              enabled: featureFlags.enabled
            })
            .from(featureFlags)
            .where(inArray(featureFlags.id, builtInAssetIds.map(assetFlagId)))
        : [];

    return { assets, flags, error: null };
  } catch (error) {
    return {
      assets: [],
      flags: [],
      error: formatAssetLoadError(error)
    };
  }
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

    if (assetSource !== "database" && assetSource !== "built-in") {
      throw new Error("Choose a valid asset source.");
    }

    if (accessibleValue !== "true" && accessibleValue !== "false") {
      throw new Error("Choose a valid access setting.");
    }

    const accessible = accessibleValue === "true";

    if (assetSource === "built-in") {
      if (!isBuiltInAssetId(assetId)) {
        throw new Error("Asset not found.");
      }

      await db
        .insert(featureFlags)
        .values({
          id: assetFlagId(assetId),
          enabled: accessible,
          description: `App access for built-in asset ${assetId}`,
          updatedByEmail: actorEmail,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: featureFlags.id,
          set: {
            enabled: accessible,
            updatedByEmail: actorEmail,
            updatedAt: new Date()
          }
        });

      await db.insert(adminAuditLogs).values({
        actorEmail,
        action: "built_in_asset.access.update",
        targetType: "built_in_asset",
        targetId: assetId,
        metadata: {
          accessible
        }
      });

      continue;
    }

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
  const builtInAssetIds = loadBuiltInAssetIds();
  const { assets, flags, error } = await loadAssets(builtInAssetIds);
  const accessOverrides = new Map(
    flags.map((flag) => [flag.id.replace(/^asset:/, ""), flag.enabled])
  );
  const existingAssets: ExistingAsset[] = [
    ...loadBuiltInBackgrounds(accessOverrides),
    ...loadBuiltInAccessories(accessOverrides),
    ...assets.map((asset) => ({
      category: "accessory" as const,
      source: "database" as const,
      id: asset.id,
      cosmeticId: asset.cosmeticId,
      label: asset.cosmeticId,
      role: `${asset.purpose} · ${asset.poseId ?? "all poses"} · ${asset.assetView ?? "default view"}`,
      storageKey: asset.storageKey,
      url: asset.publicUrl,
      sizeLabel: `${asset.width} x ${asset.height} · ${Math.round(asset.byteSize / 1024)} KB`,
      accessible: asset.accessible
    }))
  ];
  const backgroundAssets = existingAssets.filter((asset) => asset.category === "background");
  const accessoryAssets = existingAssets.filter((asset) => asset.category === "accessory");

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

        <AssetUploadForm />

        <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="theme-text-primary text-2xl font-semibold">Existing Assets</h2>
              <p className="theme-text-secondary mt-2 text-sm">
                Built-in app assets are listed for reference. Uploaded assets can be hidden or made
                available in the app.
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
              <AssetTable
                title="Backgrounds"
                assets={backgroundAssets}
              />
              <AssetTable
                title="Accessories"
                assets={accessoryAssets}
              />
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
          <table className="w-full min-w-[760px] border-separate border-spacing-y-3 text-left text-sm">
            <thead className="theme-text-tertiary">
              <tr>
                <th className="px-3 py-2 font-semibold">Asset</th>
                <th className="px-3 py-2 font-semibold">Role</th>
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
                      {asset.cosmeticId} · {asset.source === "built-in" ? "built in" : "uploaded"}
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
                  <td className="border-y px-3 py-3">{asset.role}</td>
                  <td className="border-y px-3 py-3">{asset.sizeLabel}</td>
                  <td className="border-y px-3 py-3">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input type="hidden" name={`assetSource:${asset.id}`} value={asset.source} />
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
                    {asset.source === "database" ? (
                      <label className="theme-text-secondary flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name={`delete:${asset.id}`}
                          className="h-4 w-4 accent-red-400"
                        />
                        Delete
                      </label>
                    ) : (
                      <span className="theme-text-tertiary text-sm">Cannot delete built-in</span>
                    )}
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
