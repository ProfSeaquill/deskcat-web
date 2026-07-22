import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  canWriteDeskCatAnchors,
  isDeskCatAnchorEditorEnabled
} from "../../../lib/deskcatAnchorEditor.server";
import {
  validateDeskCatAnchorDocument,
  type DeskCatAnchorDocument
} from "../../../lib/deskcatAnchors";

export const runtime = "nodejs";

const anchorFilePath = path.join(process.cwd(), "app", "data", "deskcatAnchors.json");

export async function PUT(request: Request) {
  if (!isDeskCatAnchorEditorEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canWriteDeskCatAnchors(request.headers.get("authorization"))) {
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

  const serialized = `${JSON.stringify(document as DeskCatAnchorDocument, null, 2)}\n`;
  const temporaryPath = `${anchorFilePath}.tmp`;

  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    await fs.rename(temporaryPath, anchorFilePath);
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

  return NextResponse.json({ saved: true });
}
