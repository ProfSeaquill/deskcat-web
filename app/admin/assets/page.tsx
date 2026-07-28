import { desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { getDb } from "../../db";
import { cosmeticAssets } from "../../db/schema";
import { requireAdmin } from "../../lib/admin";
import AssetUploadForm from "./AssetUploadForm";

export default async function AdminAssetsPage() {
  await requireAdmin();

  let assets: (typeof cosmeticAssets.$inferSelect)[] = [];
  let loadError: string | null = null;

  try {
    assets = await getDb()
      .select()
      .from(cosmeticAssets)
      .orderBy(desc(cosmeticAssets.createdAt))
      .limit(50);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load assets.";
  }

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
          <h2 className="theme-text-primary text-2xl font-semibold">Recent Assets</h2>

          {loadError ? (
            <div role="alert" className="mt-5 rounded-2xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200">
              {loadError}
            </div>
          ) : assets.length === 0 ? (
            <p className="theme-text-secondary mt-5 text-sm">No assets uploaded yet.</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <article key={asset.id} className="theme-subsurface rounded-2xl border p-4">
                  <div className="theme-surface flex aspect-square items-center justify-center overflow-hidden rounded-xl border p-3">
                    <Image
                      src={asset.publicUrl}
                      alt=""
                      width={asset.width}
                      height={asset.height}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="theme-text-primary mt-3 text-sm font-semibold">
                    {asset.cosmeticId}
                  </div>
                  <div className="theme-text-secondary mt-1 text-xs">
                    {asset.purpose} · {asset.assetView ?? "default"} · {asset.poseId ?? "all poses"}
                  </div>
                  <div className="theme-text-tertiary mt-2 break-all font-mono text-[11px]">
                    {asset.storageKey}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
