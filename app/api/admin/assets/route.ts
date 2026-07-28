import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { adminAuditLogs, cosmeticAssets, cosmetics } from "../../../db/schema";
import { getAdminSession } from "../../../lib/admin";
import {
  getDeskCatCosmetic,
  isDeskCatCosmeticId,
  type DeskCatCosmeticId
} from "../../../lib/deskcatSprite";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const VALID_PURPOSES = new Set(["preview", "render"]);
const VALID_ASSET_VIEWS = new Set(["front", "threeQuarter"]);
const VALID_POSE_IDS = new Set(["logo", "playing", "reading", "sleeping", "sitting", "walking"]);

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

function getBlobCredentials(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return { token };

  const oidcToken = request.headers.get("x-vercel-oidc-token") ?? undefined;
  const storeId = process.env.BLOB_STORE_ID;
  if (oidcToken && storeId) return { oidcToken, storeId };

  return null;
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
    return jsonError("Upload must be a PNG file up to 2 MB.", 400);
  }

  if (file.type !== "image/png") {
    return jsonError("Only PNG uploads are supported for now.", 400);
  }

  const cosmeticId = parseOptionalString(formData.get("cosmeticId"));
  if (!isDeskCatCosmeticId(cosmeticId)) {
    return jsonError("Choose a valid DeskCat cosmetic.", 400);
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

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const dimensions = parsePngDimensions(bytes);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return jsonError("Upload must be a valid PNG image.", 400);
  }

  const currentCosmetic = getDeskCatCosmetic(cosmeticId as DeskCatCosmeticId);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const pathname = `admin/cosmetics/${cosmeticId}/${randomUUID()}.png`;

  try {
    const blob = await put(pathname, arrayBuffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      ...blobCredentials
    });

    const db = getDb();
    await db
      .insert(cosmetics)
      .values({
        id: currentCosmetic.id,
        label: currentCosmetic.label,
        description: currentCosmetic.description,
        category: currentCosmetic.category,
        anchorSlot: currentCosmetic.anchorSlot,
        status: "draft"
      })
      .onConflictDoNothing();

    const [asset] = await db
      .insert(cosmeticAssets)
      .values({
        cosmeticId: currentCosmetic.id,
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
        checksum
      })
      .returning();

    await db.insert(adminAuditLogs).values({
      actorEmail: session.user.email,
      action: "cosmetic_asset.upload",
      targetType: "cosmetic_asset",
      targetId: asset.id,
      metadata: {
        cosmeticId: currentCosmetic.id,
        purpose,
        assetView,
        poseId,
        pathname: blob.pathname,
        byteSize: file.size,
        width: dimensions.width,
        height: dimensions.height
      }
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not upload asset.",
      500
    );
  }
}
