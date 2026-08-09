import { NextResponse } from "next/server";
import { loadPublicAppearanceCatalog } from "../../../lib/appearanceCatalog.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await loadPublicAppearanceCatalog();
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not load appearance options." }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
