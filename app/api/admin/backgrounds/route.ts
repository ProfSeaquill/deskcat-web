import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { adminAuditLogs, appearanceBackgrounds } from "../../../db/schema";
import { getAdminSession } from "../../../lib/admin";
import {
  MAX_BACKGROUND_THEME_FILE_BYTES,
  parseBackgroundThemeFile
} from "../../../lib/backgroundThemeFile";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session?.user?.email) return jsonError("Not found.", 404);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BACKGROUND_THEME_FILE_BYTES) {
    return jsonError("Background JSON must be no larger than 64 KB.", 413);
  }

  let theme;
  try {
    theme = parseBackgroundThemeFile(await request.json());
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Background JSON is invalid.",
      400
    );
  }

  try {
    const db = getDb();
    const updatedAt = new Date();
    const [background] = await db
      .insert(appearanceBackgrounds)
      .values({
        ...theme,
        updatedByEmail: session.user.email,
        updatedAt
      })
      .onConflictDoUpdate({
        target: appearanceBackgrounds.id,
        set: {
          label: theme.label,
          description: theme.description,
          background: theme.background,
          foreground: theme.foreground,
          accent: theme.accent,
          border: theme.border,
          swatches: theme.swatches,
          surfaceMode: theme.surfaceMode,
          accessible: theme.accessible,
          sortOrder: theme.sortOrder,
          updatedByEmail: session.user.email,
          updatedAt
        }
      })
      .returning();

    await db.insert(adminAuditLogs).values({
      actorEmail: session.user.email,
      action: "appearance_background.import",
      targetType: "appearance_background",
      targetId: theme.id,
      metadata: {
        label: theme.label,
        accessible: theme.accessible,
        surfaceMode: theme.surfaceMode,
        sortOrder: theme.sortOrder
      }
    });

    revalidatePath("/admin/assets");
    revalidatePath("/my-deskcat");
    revalidatePath("/");

    return NextResponse.json({ background });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save background.",
      500
    );
  }
}
