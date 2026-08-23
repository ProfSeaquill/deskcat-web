import { NextResponse } from "next/server";
import { loadDeskCatAnchors } from "../../../lib/deskcatAnchors.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const anchors = await loadDeskCatAnchors();
  return NextResponse.json(anchors, {
    headers: { "Cache-Control": "no-store" }
  });
}
