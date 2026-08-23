import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { deskcatAnchorSettings } from "../db/schema";
import {
  DESKCAT_ANCHOR_DATA,
  validateDeskCatAnchorDocument,
  type DeskCatAnchorDocument
} from "./deskcatAnchors";

const CURRENT_ANCHOR_DOCUMENT_ID = "current";

export type PublishedDeskCatAnchors = {
  document: DeskCatAnchorDocument;
  revision: string;
  source: "database" | "bundled";
};

export const BUNDLED_DESKCAT_ANCHORS: PublishedDeskCatAnchors = {
  document: DESKCAT_ANCHOR_DATA,
  revision: "bundled",
  source: "bundled"
};

export async function loadDeskCatAnchors(): Promise<PublishedDeskCatAnchors> {
  try {
    const [row] = await getDb()
      .select({ document: deskcatAnchorSettings.document, updatedAt: deskcatAnchorSettings.updatedAt })
      .from(deskcatAnchorSettings)
      .where(eq(deskcatAnchorSettings.id, CURRENT_ANCHOR_DOCUMENT_ID))
      .limit(1);

    if (!row) return BUNDLED_DESKCAT_ANCHORS;

    const errors = validateDeskCatAnchorDocument(row.document);
    if (errors.length > 0) {
      console.error(`Stored DeskCat anchor data is invalid and was not served: ${errors.join(" ")}`);
      return BUNDLED_DESKCAT_ANCHORS;
    }

    return {
      document: row.document,
      revision: row.updatedAt.toISOString(),
      source: "database"
    };
  } catch (error) {
    console.error("Could not load DeskCat anchors from the database; using bundled anchors.", error);
    return BUNDLED_DESKCAT_ANCHORS;
  }
}

export async function saveDeskCatAnchors(document: DeskCatAnchorDocument, actorEmail: string) {
  const errors = validateDeskCatAnchorDocument(document);
  if (errors.length > 0) throw new DeskCatAnchorValidationError(errors);

  const now = new Date();
  await getDb()
    .insert(deskcatAnchorSettings)
    .values({
      id: CURRENT_ANCHOR_DOCUMENT_ID,
      document,
      updatedByEmail: actorEmail,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: deskcatAnchorSettings.id,
      set: { document, updatedByEmail: actorEmail, updatedAt: now }
    });

  return { revision: now.toISOString() };
}

export class DeskCatAnchorValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super("The DeskCat anchor document is not valid.");
    this.name = "DeskCatAnchorValidationError";
    this.errors = errors;
  }
}
