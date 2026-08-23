import { createHash, randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { adminAuditLogs, cosmeticAssets, cosmetics } from "../../../db/schema";
import { getAdminSession } from "../../../lib/admin";
import { getBlobCredentials } from "../../../lib/blob.server";
import type { DeskCatCosmeticCategory } from "../../../lib/deskcatSprite";
import type { DeskCatAnchorSlotId } from "../../../lib/deskcatAnchors";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const VALID_PURPOSES = new Set(["preview", "render"]);
const VALID_CATEGORIES = new Set(["head", "neck", "tail", "glasses"]);
const VALID_ANCHOR_SLOTS = new Set(["eyes", "head", "neck", "tail"]);
const VALID_ASSET_VIEWS = new Set(["front", "threeQuarter"]);
const VALID_POSE_IDS = new Set(["logo", "playing", "reading", "sleeping", "sitting", "walking"]);
const COSMETIC_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parsePngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20)
  };
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Not found.", 404);

  try {
    const assets = await getDb()
      .select()
      .from(cosmeticAssets)
      .orderBy(desc(cosmeticAssets.createdAt))
      .limit(50);

    return NextResponse.json({ assets });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load assets.",
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session?.user?.email) return jsonError("Not found.", 404);

  const blobCredentials = getBlobCredentials(request);
  if (!blobCredentials) {
    return jsonError("Blob storage is not configured.", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Request body must be multipart form data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("A PNG file is required.", 400);
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return jsonError("Upload must be a PNG file up to 4 MB.", 400);
  }

  if (file.type !== "image/png") {
    return jsonError("Only PNG uploads are supported for now.", 400);
  }

  const cosmeticName = parseOptionalString(formData.get("cosmeticName"));
  if (!cosmeticName || cosmeticName.length > 120) {
    return jsonError("Enter a cosmetic name up to 120 characters.", 400);
  }

  const cosmeticId = parseOptionalString(formData.get("cosmeticId"));
  if (!cosmeticId || !COSMETIC_ID_PATTERN.test(cosmeticId)) {
    return jsonError("Enter a cosmetic ID with lowercase letters, numbers, and dashes.", 400);
  }

  const description = parseOptionalString(formData.get("description")) ?? "";
  if (description.length > 500) {
    return jsonError("Description must be 500 characters or fewer.", 400);
  }

  const category = parseOptionalString(formData.get("category")) ?? "head";
  if (!VALID_CATEGORIES.has(category)) {
    return jsonError("Choose a valid cosmetic category.", 400);
  }

  const anchorSlot = parseOptionalString(formData.get("anchorSlot")) ?? "head";
  if (!VALID_ANCHOR_SLOTS.has(anchorSlot)) {
    return jsonError("Choose a valid anchor slot.", 400);
  }

  const purpose = parseOptionalString(formData.get("purpose")) ?? "render";
  if (!VALID_PURPOSES.has(purpose)) {
    return jsonError("Choose a valid asset purpose.", 400);
  }

  const assetView = parseOptionalString(formData.get("assetView"));
  if (assetView && !VALID_ASSET_VIEWS.has(assetView)) {
    return jsonError("Choose a valid asset view.", 400);
  }

  const poseId = parseOptionalString(formData.get("poseId"));
  if (poseId && !VALID_POSE_IDS.has(poseId)) {
    return jsonError("Choose a valid pose.", 400);
  }

  const accessibleValue = parseOptionalString(formData.get("accessible")) ?? "true";
  if (accessibleValue !== "true" && accessibleValue !== "false") {
    return jsonError("Choose a valid access setting.", 400);
  }
  const accessible = accessibleValue === "true";

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const dimensions = parsePngDimensions(bytes);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return jsonError("Upload must be a valid PNG image.", 400);
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const pathname = `admin/cosmetics/${cosmeticId}/${randomUUID()}.png`;

  try {
    const db = getDb();
    const [existingCosmetic] = await db
      .select({
        id: cosmetics.id
      })
      .from(cosmetics)
      .where(eq(cosmetics.id, cosmeticId))
      .limit(1);

    const [existingAsset] = await db
      .select()
      .from(cosmeticAssets)
      .where(
        and(
          eq(cosmeticAssets.cosmeticId, cosmeticId),
          eq(cosmeticAssets.purpose, purpose as "preview" | "render"),
          assetView
            ? eq(cosmeticAssets.assetView, assetView as "front" | "threeQuarter")
            : isNull(cosmeticAssets.assetView),
          poseId
            ? eq(
                cosmeticAssets.poseId,
                poseId as "logo" | "playing" | "reading" | "sleeping" | "sitting" | "walking"
              )
            : isNull(cosmeticAssets.poseId)
        )
      )
      .orderBy(desc(cosmeticAssets.createdAt))
      .limit(1);

    const blob = await put(pathname, arrayBuffer, {
      access: "private",
      contentType: "image/png",
      addRandomSuffix: false,
      ...blobCredentials
    });

    try {
      if (existingCosmetic) {
        await db
          .update(cosmetics)
          .set({
            label: cosmeticName,
            description,
            category: category as DeskCatCosmeticCategory,
            anchorSlot: anchorSlot as DeskCatAnchorSlotId,
            updatedAt: new Date()
          })
          .where(eq(cosmetics.id, cosmeticId));
      } else {
        await db
          .insert(cosmetics)
          .values({
            id: cosmeticId,
            label: cosmeticName,
            description,
            category: category as DeskCatCosmeticCategory,
            anchorSlot: anchorSlot as DeskCatAnchorSlotId,
            status: "draft"
          });
      }

      const assetValues = {
        cosmeticId,
        purpose: purpose as "preview" | "render",
        assetView: assetView as "front" | "threeQuarter" | null,
        poseId: poseId as
          | "logo"
          | "playing"
          | "reading"
          | "sleeping"
          | "sitting"
          | "walking"
          | null,
        storageKey: blob.pathname,
        publicUrl: blob.url,
        mimeType: "image/png",
        byteSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
        checksum,
        accessible,
        updatedByEmail: session.user.email,
        updatedAt: new Date()
      } as const;

      const [asset] = existingAsset
        ? await db
            .update(cosmeticAssets)
            .set(assetValues)
            .where(eq(cosmeticAssets.id, existingAsset.id))
            .returning()
        : await db.insert(cosmeticAssets).values(assetValues).returning();

      if (existingAsset && existingAsset.storageKey !== blob.pathname) {
        await del(existingAsset.storageKey, blobCredentials).catch(() => undefined);
      }

      await db.insert(adminAuditLogs).values({
        actorEmail: session.user.email,
        action: existingAsset ? "cosmetic_asset.replace" : "cosmetic_asset.upload",
        targetType: "cosmetic_asset",
        targetId: asset.id,
        metadata: {
          cosmeticId,
          cosmeticName,
          category,
          anchorSlot,
          purpose,
          assetView,
          poseId,
          pathname: blob.pathname,
          byteSize: file.size,
          width: dimensions.width,
          height: dimensions.height,
          accessible
        }
      });

      return NextResponse.json({ asset }, { status: existingAsset ? 200 : 201 });
    } catch (error) {
      await del(blob.pathname, blobCredentials).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not upload asset.",
      500
    );
  }
}
