import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../lib/admin";
import { authOptions } from "../../../lib/auth";
import {
  EDITOR_SESSION_COOKIE,
  canWriteDeskCatAnchors,
  isDeskCatAnchorEditorEnabled,
  isDeskCatAnchorEditorSessionValid
} from "../../../lib/deskcatAnchorEditor.server";
import { getServerSession } from "next-auth";
import {
  validateDeskCatAnchorDocument,
  type DeskCatAnchorDocument
} from "../../../lib/deskcatAnchors";
import { saveDeskCatAnchors } from "../../../lib/deskcatAnchors.server";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isAdmin = isAdminEmail(session?.user?.email);
  const isLegacyEditorEnabled = isDeskCatAnchorEditorEnabled();

  if (!isAdmin && !isLegacyEditorEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const hasSession =
    isLegacyEditorEnabled &&
    isDeskCatAnchorEditorSessionValid(request.cookies.get(EDITOR_SESSION_COOKIE)?.value);
  const hasToken =
    isLegacyEditorEnabled && canWriteDeskCatAnchors(request.headers.get("authorization"));
  if (!isAdmin && !hasSession && !hasToken) {
    return NextResponse.json({ error: "A valid editor token is required." }, { status: 401 });
  }

  let document: unknown;
  try {
    document = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const errors = validateDeskCatAnchorDocument(document);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Anchor data is invalid.", errors }, { status: 400 });
  }

  try {
    const saved = await saveDeskCatAnchors(
      document as DeskCatAnchorDocument,
      session?.user?.email ?? "legacy-anchor-editor"
    );
    return NextResponse.json({ saved: true, revision: saved.revision });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not save anchor data: ${error.message}`
            : "Could not save anchor data."
      },
      { status: 500 }
    );
  }
}
