import "server-only";

import { desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import { adminAuditLogs, reflectionTreeRevisions } from "../db/schema";
import { REFLECTION_TREE, validateReflectionTree, type ReflectionTree } from "./reflectionTree";

export type ReflectionTreeSource = "database" | "bundled";

export type PublishedReflectionTree = {
  /** Content revision. 0 means the copy compiled into the build. */
  revision: number;
  publishedAt: string | null;
  source: ReflectionTreeSource;
  tree: ReflectionTree;
};

/**
 * The tree that shipped with the build. Reflection is the one flow a writer
 * reaches straight after a session, so it always has something to render: a
 * database that is unreachable, empty, or holding a document that no longer
 * validates falls back here rather than failing the page.
 */
export const BUNDLED_REFLECTION_TREE: PublishedReflectionTree = {
  revision: 0,
  publishedAt: null,
  source: "bundled",
  tree: REFLECTION_TREE
};

export async function loadPublishedReflectionTree(): Promise<PublishedReflectionTree> {
  let row;

  try {
    [row] = await getDb()
      .select({
        revision: reflectionTreeRevisions.revision,
        document: reflectionTreeRevisions.document,
        publishedAt: reflectionTreeRevisions.publishedAt
      })
      .from(reflectionTreeRevisions)
      .where(eq(reflectionTreeRevisions.status, "published"))
      .orderBy(desc(reflectionTreeRevisions.revision))
      .limit(1);
  } catch {
    return BUNDLED_REFLECTION_TREE;
  }

  if (!row) return BUNDLED_REFLECTION_TREE;

  // Re-checked on the way out, not just on the way in: a revision can be edited
  // straight in the database, and serving a broken tree would strand a reader
  // mid-reflection or log the session with no outcome.
  const report = validateReflectionTree(row.document);
  if (report.errors.length > 0) {
    console.error(
      `Reflection tree revision ${row.revision} failed validation and was not served: ${report.errors.join(" ")}`
    );
    return BUNDLED_REFLECTION_TREE;
  }

  return {
    revision: row.revision,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    source: "database",
    tree: row.document
  };
}

export async function loadReflectionTreeRevisions() {
  try {
    return await getDb()
      .select({
        revision: reflectionTreeRevisions.revision,
        status: reflectionTreeRevisions.status,
        label: reflectionTreeRevisions.label,
        updatedByEmail: reflectionTreeRevisions.updatedByEmail,
        createdAt: reflectionTreeRevisions.createdAt,
        updatedAt: reflectionTreeRevisions.updatedAt,
        publishedAt: reflectionTreeRevisions.publishedAt
      })
      .from(reflectionTreeRevisions)
      .orderBy(desc(reflectionTreeRevisions.revision));
  } catch {
    return [];
  }
}

/**
 * Copies the bundled tree in as revision 1 so the database has something to
 * serve. Does nothing once any revision exists, so it is safe to call on every
 * admin page load.
 */
export async function seedReflectionTree(actorEmail: string) {
  const db = getDb();

  const [existing] = await db
    .select({ revision: reflectionTreeRevisions.revision })
    .from(reflectionTreeRevisions)
    .orderBy(desc(reflectionTreeRevisions.revision))
    .limit(1);

  if (existing) return { seeded: false, revision: existing.revision };

  const report = validateReflectionTree(REFLECTION_TREE);
  if (report.errors.length > 0) {
    throw new Error(`The bundled reflection tree is invalid: ${report.errors.join(" ")}`);
  }

  await db.insert(reflectionTreeRevisions).values({
    revision: 1,
    status: "published",
    label: "Imported from the bundled tree",
    document: REFLECTION_TREE,
    updatedByEmail: actorEmail,
    publishedAt: new Date()
  });

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "reflection_tree.seed",
    targetType: "reflection_tree_revision",
    targetId: "1",
    metadata: { nodeCount: Object.keys(REFLECTION_TREE.nodes).length }
  });

  return { seeded: true, revision: 1 };
}


export type ReflectionTreeDraft = {
  id: string;
  revision: number;
  label: string;
  document: ReflectionTree;
  updatedByEmail: string | null;
  updatedAt: string;
};

/**
 * There is at most one draft at a time. Its `revision` is a placeholder: publishing
 * re-stamps it to one past the highest revision in the table, so a draft can never
 * publish underneath a newer revision (which is what would happen if a rollback
 * landed while the draft was open).
 */
export async function loadReflectionTreeDraft(): Promise<ReflectionTreeDraft | null> {
  try {
    const [row] = await getDb()
      .select({
        id: reflectionTreeRevisions.id,
        revision: reflectionTreeRevisions.revision,
        label: reflectionTreeRevisions.label,
        document: reflectionTreeRevisions.document,
        updatedByEmail: reflectionTreeRevisions.updatedByEmail,
        updatedAt: reflectionTreeRevisions.updatedAt
      })
      .from(reflectionTreeRevisions)
      .where(eq(reflectionTreeRevisions.status, "draft"))
      .orderBy(desc(reflectionTreeRevisions.revision))
      .limit(1);

    if (!row) return null;

    return { ...row, updatedAt: row.updatedAt.toISOString() };
  } catch {
    return null;
  }
}

export async function loadReflectionTreeRevision(revision: number) {
  const [row] = await getDb()
    .select({ document: reflectionTreeRevisions.document, status: reflectionTreeRevisions.status })
    .from(reflectionTreeRevisions)
    .where(eq(reflectionTreeRevisions.revision, revision))
    .limit(1);

  return row ?? null;
}

/**
 * One past the highest revision in the table. `excludeId` skips the draft row being
 * published, so the very first publish on an empty table lands on revision 1 rather
 * than stepping over its own placeholder.
 */
async function nextRevisionNumber(excludeId?: string) {
  const query = getDb()
    .select({ highest: sql<number | null>`max(${reflectionTreeRevisions.revision})` })
    .from(reflectionTreeRevisions);

  const [row] = excludeId
    ? await query.where(ne(reflectionTreeRevisions.id, excludeId))
    : await query;

  return Number(row?.highest ?? 0) + 1;
}

function assertValid(document: ReflectionTree) {
  const report = validateReflectionTree(document);
  if (report.errors.length > 0) {
    throw new ReflectionTreeValidationError(report.errors);
  }
}

export class ReflectionTreeValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super("The reflection tree is not valid.");
    this.name = "ReflectionTreeValidationError";
    this.errors = errors;
  }
}

export async function saveReflectionTreeDraft(
  document: ReflectionTree,
  actorEmail: string,
  label: string
) {
  assertValid(document);

  const db = getDb();
  const existing = await loadReflectionTreeDraft();

  if (existing) {
    await db
      .update(reflectionTreeRevisions)
      .set({ document, label, updatedByEmail: actorEmail, updatedAt: new Date() })
      .where(eq(reflectionTreeRevisions.id, existing.id));

    return { revision: existing.revision, created: false };
  }

  const revision = await nextRevisionNumber();

  await db.insert(reflectionTreeRevisions).values({
    revision,
    status: "draft",
    label,
    document,
    updatedByEmail: actorEmail
  });

  return { revision, created: true };
}

export async function publishReflectionTreeDraft(actorEmail: string) {
  const draft = await loadReflectionTreeDraft();
  if (!draft) throw new Error("There is no draft to publish.");

  assertValid(draft.document);

  const db = getDb();
  const revision = await nextRevisionNumber(draft.id);
  const now = new Date();

  await db
    .update(reflectionTreeRevisions)
    .set({ revision, status: "published", publishedAt: now, updatedAt: now, updatedByEmail: actorEmail })
    .where(eq(reflectionTreeRevisions.id, draft.id));

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "reflection_tree.publish",
    targetType: "reflection_tree_revision",
    targetId: String(revision),
    metadata: { nodeCount: Object.keys(draft.document.nodes).length, label: draft.label }
  });

  return { revision };
}

export async function discardReflectionTreeDraft(actorEmail: string) {
  const draft = await loadReflectionTreeDraft();
  if (!draft) return { discarded: false };

  const db = getDb();
  await db.delete(reflectionTreeRevisions).where(eq(reflectionTreeRevisions.id, draft.id));

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "reflection_tree.discard_draft",
    targetType: "reflection_tree_revision",
    targetId: String(draft.revision),
    metadata: { label: draft.label }
  });

  return { discarded: true };
}

/**
 * Rolling back publishes a copy of an older document as a new revision rather than
 * reviving the old row, so the history stays append-only and the live tree is always
 * the highest published revision.
 */
export async function rollbackReflectionTree(revision: number, actorEmail: string) {
  const source = await loadReflectionTreeRevision(revision);
  if (!source) throw new Error(`Revision ${revision} does not exist.`);

  assertValid(source.document);

  const db = getDb();
  const newRevision = await nextRevisionNumber();
  const now = new Date();

  await db.insert(reflectionTreeRevisions).values({
    revision: newRevision,
    status: "published",
    label: `Rolled back to revision ${revision}`,
    document: source.document,
    updatedByEmail: actorEmail,
    publishedAt: now,
    updatedAt: now
  });

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "reflection_tree.rollback",
    targetType: "reflection_tree_revision",
    targetId: String(newRevision),
    metadata: { revertedTo: revision }
  });

  return { revision: newRevision };
}
