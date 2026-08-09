import { get } from "@vercel/blob";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { cosmeticAssets, cosmetics } from "../../../../db/schema";
import { getBlobCredentials } from "../../../../lib/blob.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await context.params;
  if (!UUID_PATTERN.test(assetId)) {
    return new Response("Not found.", { status: 404 });
  }

  try {
    const [asset] = await getDb()
      .select({
        storageKey: cosmeticAssets.storageKey,
        mimeType: cosmeticAssets.mimeType
      })
      .from(cosmeticAssets)
      .innerJoin(cosmetics, eq(cosmeticAssets.cosmeticId, cosmetics.id))
      .where(
        and(
          eq(cosmeticAssets.id, assetId),
          eq(cosmeticAssets.accessible, true),
          ne(cosmetics.status, "retired")
        )
      )
      .limit(1);

    if (!asset) return new Response("Not found.", { status: 404 });

    const credentials = getBlobCredentials(request);
    if (!credentials) return new Response("Asset storage is unavailable.", { status: 503 });

    const blob = await get(asset.storageKey, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
      ...credentials
    });

    if (!blob) return new Response("Not found.", { status: 404 });

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      ETag: blob.blob.etag
    });

    if (blob.statusCode === 304) {
      return new Response(null, { status: 304, headers });
    }

    headers.set("Content-Type", blob.blob.contentType || asset.mimeType);
    headers.set("Content-Length", String(blob.blob.size));
    return new Response(blob.stream, { status: 200, headers });
  } catch {
    return new Response("Not found.", { status: 404 });
  }
}
