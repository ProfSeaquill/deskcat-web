import { NextResponse } from "next/server";
import { loadPublishedReflectionTree } from "../../../lib/reflectionTree.server";

export const dynamic = "force-dynamic";

/**
 * Always answers 200. The loader falls back to the bundled tree on any failure,
 * so a reader finishing a session never meets an error here.
 */
export async function GET() {
  const published = await loadPublishedReflectionTree();

  return NextResponse.json(published, {
    headers: {
      "Cache-Control": "no-store",
      "X-Reflection-Tree-Source": published.source
    }
  });
}
