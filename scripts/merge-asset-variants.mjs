/**
 * Folds cosmetics that were created from a view-suffixed filename (for example
 * `red-bowtie-3-4` from `red_bowtie_3:4.png`) back into their base cosmetic as
 * an `asset_view` variant, which is what the schema and the sprite renderer
 * always expected.
 *
 * Dry run by default. Pass --apply to write.
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or POSTGRES_URL is required to merge asset variants.");
}

const shouldApply = process.argv.includes("--apply");
const sql = neon(databaseUrl);

const VIEW_SUFFIXES = [
  { pattern: /-(?:3-4|34|three-quarter|threequarter|3q)$/, assetView: "threeQuarter" },
  { pattern: /-front$/, assetView: "front" }
];

function parseCosmeticId(cosmeticId) {
  for (const { pattern, assetView } of VIEW_SUFFIXES) {
    const baseId = cosmeticId.replace(pattern, "");
    if (baseId !== cosmeticId && baseId.length > 0) return { baseId, assetView };
  }
  return null;
}

const cosmeticRows = await sql`
  SELECT id, label, description, category, anchor_slot, status, sort_order
  FROM cosmetics
  ORDER BY id
`;
const cosmeticsById = new Map(cosmeticRows.map((cosmetic) => [cosmetic.id, cosmetic]));

// Group every suffixed cosmetic under the base ID it should have been.
const mergeGroups = new Map();
for (const cosmetic of cosmeticRows) {
  const parsed = parseCosmeticId(cosmetic.id);
  if (!parsed) continue;

  const group = mergeGroups.get(parsed.baseId) ?? [];
  group.push({ ...cosmetic, assetView: parsed.assetView });
  mergeGroups.set(parsed.baseId, group);
}

if (mergeGroups.size === 0) {
  console.log("No view-suffixed cosmetics found. Nothing to merge.");
  process.exit(0);
}

let mergedAssets = 0;
let mergedCosmetics = 0;
let skipped = 0;

for (const [baseId, sources] of mergeGroups) {
  const baseCosmetic = cosmeticsById.get(baseId);
  const anchor = baseCosmetic ?? sources[0];

  // Every source has to agree with the base on how it is anchored, otherwise
  // merging them would change how existing poses draw the cosmetic.
  const conflicting = sources.filter(
    (source) =>
      source.category !== anchor.category || source.anchor_slot !== anchor.anchor_slot
  );
  if (conflicting.length > 0) {
    console.warn(
      `SKIP ${baseId}: ${conflicting
        .map((source) => source.id)
        .join(", ")} disagree with the base cosmetic on category or anchor slot.`
    );
    skipped += conflicting.length;
    continue;
  }

  console.log(
    `${baseCosmetic ? "MERGE" : "CREATE+MERGE"} ${baseId} <- ${sources
      .map((source) => `${source.id} (${source.assetView})`)
      .join(", ")}`
  );

  if (shouldApply && !baseCosmetic) {
    const seed = sources[0];
    await sql`
      INSERT INTO cosmetics (id, label, description, category, anchor_slot, status, sort_order)
      VALUES (
        ${baseId},
        ${seed.label},
        ${seed.description},
        ${seed.category}::cosmetic_category,
        ${seed.anchor_slot}::anchor_slot,
        ${seed.status}::cosmetic_status,
        ${seed.sort_order}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  for (const source of sources) {
    const assetRows = await sql`
      SELECT id, purpose, asset_view, pose_id, storage_key
      FROM cosmetic_assets
      WHERE cosmetic_id = ${source.id}
    `;

    for (const asset of assetRows) {
      // A pose-specific asset already targets one pose; only view-level assets
      // get the view stamped on them.
      const nextAssetView = asset.pose_id ? asset.asset_view : (asset.asset_view ?? source.assetView);

      const [clash] = await sql`
        SELECT id FROM cosmetic_assets
        WHERE cosmetic_id = ${baseId}
          AND purpose = ${asset.purpose}::cosmetic_asset_purpose
          AND asset_view IS NOT DISTINCT FROM ${nextAssetView}::asset_view
          AND pose_id IS NOT DISTINCT FROM ${asset.pose_id}::pose_id
        LIMIT 1
      `;

      if (clash) {
        console.warn(
          `  SKIP asset ${asset.storage_key}: ${baseId} already has a ${asset.purpose}/${nextAssetView ?? "default"} asset.`
        );
        skipped += 1;
        continue;
      }

      console.log(`  move ${asset.storage_key} -> ${baseId} (${nextAssetView ?? "default"})`);

      if (shouldApply) {
        await sql`
          UPDATE cosmetic_assets
          SET cosmetic_id = ${baseId},
              asset_view = ${nextAssetView}::asset_view,
              updated_at = now()
          WHERE id = ${asset.id}
        `;
      }
      mergedAssets += 1;
    }

    if (shouldApply) {
      // Pose placements follow their cosmetic, unless the base already has one.
      await sql`
        UPDATE cosmetic_pose_placements AS source
        SET cosmetic_id = ${baseId}, updated_at = now()
        WHERE source.cosmetic_id = ${source.id}
          AND NOT EXISTS (
            SELECT 1 FROM cosmetic_pose_placements AS target
            WHERE target.cosmetic_id = ${baseId} AND target.pose_id = source.pose_id
          )
      `;

      // Deleting a cosmetic cascades to its assets, so only drop the source
      // once every asset has been moved off it.
      const [remaining] = await sql`
        SELECT count(*)::int AS count FROM cosmetic_assets WHERE cosmetic_id = ${source.id}
      `;

      if (remaining.count > 0) {
        console.warn(
          `  KEEP ${source.id}: ${remaining.count} asset(s) could not be moved. Resolve them by hand, then re-run.`
        );
        continue;
      }

      await sql`DELETE FROM cosmetic_pose_placements WHERE cosmetic_id = ${source.id}`;
      await sql`DELETE FROM cosmetics WHERE id = ${source.id}`;
    }
    mergedCosmetics += 1;
  }
}

console.log(
  `\n${shouldApply ? "Applied" : "Dry run"}: ${mergedAssets} assets moved, ${mergedCosmetics} duplicate cosmetics removed, ${skipped} skipped.`
);
if (!shouldApply) {
  console.log("Re-run with --apply to write these changes.");
}
