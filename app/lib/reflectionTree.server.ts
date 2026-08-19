import "server-only";

import { desc, eq } from "drizzle-orm";
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
