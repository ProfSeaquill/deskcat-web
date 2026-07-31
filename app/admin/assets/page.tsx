import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { adminAuditLogs, cosmeticAssets } from "../../db/schema";
import { requireAdmin } from "../../lib/admin";
import { DESKCAT_COSMETIC_OPTIONS } from "../../lib/deskcatSprite";
import AssetUploadForm from "./AssetUploadForm";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExistingAsset =
  | {
      source: "built-in";
      id: string;
      cosmeticId: string;
      label: string;
      role: string;
      storageKey: string;
      url: string;
      width: number;
      height: number;
      byteSize: null;
      accessible: true;
    }
  | {
      source: "database";
      id: string;
      cosmeticId: string;
      label: string;
      role: string;
      storageKey: string;
      url: string;
      width: number;
      height: number;
      byteSize: number;
      accessible: boolean;
    };

function loadBuiltInAssets(): ExistingAsset[] {
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
      source: "built-in" as const,
      id: `built-in:${cosmetic.id}:${index}`,
      cosmeticId: cosmetic.id,
      label: cosmetic.label,
      role: asset.roles.join(", "),
      storageKey: url,
      url,
      width: asset.width,
      height: asset.height,
      byteSize: null,
      accessible: true as const
    }));
  });
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

async function loadAssets() {
  try {
    const assets = await getDb()
      .select()
      .from(cosmeticAssets)
      .orderBy(desc(cosmeticAssets.createdAt))
      .limit(100);

    return { assets, error: null };
  } catch (error) {
    return {
      assets: [],
      error: formatAssetLoadError(error)
    };
  }
}

async function updateAssetAccess(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const assetId = formData.get("assetId");
  const accessibleValue = formData.get("accessible");

  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new Error("Choose a valid asset.");
  }

  if (accessibleValue !== "true" && accessibleValue !== "false") {
    throw new Error("Choose a valid access setting.");
  }

  const accessible = accessibleValue === "true";
  const actorEmail = session.user?.email ?? "unknown";
  const db = getDb();
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

  revalidatePath("/admin/assets");
}

export default async function AdminAssetsPage() {
  await requireAdmin();
  const { assets, error } = await loadAssets();
  const existingAssets: ExistingAsset[] = [
    ...loadBuiltInAssets(),
    ...assets.map((asset) => ({
      source: "database" as const,
      id: asset.id,
      cosmeticId: asset.cosmeticId,
      label: asset.cosmeticId,
      role: `${asset.purpose} · ${asset.poseId ?? "all poses"} · ${asset.assetView ?? "default view"}`,
      storageKey: asset.storageKey,
      url: asset.publicUrl,
      width: asset.width,
      height: asset.height,
      byteSize: asset.byteSize,
      accessible: asset.accessible
    }))
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
            <div className="mt-5 overflow-x-auto">
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
                  {existingAssets.map((asset) => (
                    <tr key={asset.id} className="theme-subsurface">
                      <td className="rounded-l-2xl border-y border-l px-3 py-3">
                        <div className="theme-text-primary font-semibold">{asset.label}</div>
                        <div className="theme-text-tertiary mt-1 text-xs">
                          {asset.cosmeticId} · {asset.source === "built-in" ? "built in" : "uploaded"}
                        </div>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="theme-link mt-1 block max-w-[260px] truncate text-xs"
                        >
                          {asset.storageKey}
                        </a>
                      </td>
                      <td className="border-y px-3 py-3">
                        {asset.role}
                      </td>
                      <td className="border-y px-3 py-3">
                        {asset.width} x {asset.height}
                        {asset.byteSize === null ? (
                          <div className="theme-text-tertiary text-xs">bundled file</div>
                        ) : (
                          <div className="theme-text-tertiary text-xs">
                            {Math.round(asset.byteSize / 1024)} KB
                          </div>
                        )}
                      </td>
                      <td className="border-y px-3 py-3">
                        {asset.source === "database" ? (
                          <form action={updateAssetAccess} className="flex items-center gap-2">
                            <input type="hidden" name="assetId" value={asset.id} />
                            <select
                              name="accessible"
                              defaultValue={asset.accessible ? "true" : "false"}
                              className="theme-input w-full min-w-[150px] rounded-xl border px-3 py-2"
                            >
                              <option value="true">Accessible</option>
                              <option value="false">Hidden</option>
                            </select>
                            <button
                              type="submit"
                              className="theme-button-secondary theme-hover-highlight rounded-xl border px-3 py-2 text-sm font-semibold transition"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <span className="theme-text-secondary text-sm">Always available</span>
                        )}
                      </td>
                      <td className="rounded-r-2xl border-y border-r px-3 py-3">
                        <span
                          className={
                            asset.accessible
                              ? "text-sm font-semibold text-emerald-300"
                              : "text-sm font-semibold text-amber-300"
                          }
                        >
                          {asset.accessible ? "Accessible" : "Hidden"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
