/**
 * Copies the bundled reflection tree into `reflection_tree_revisions` as
 * revision 1, published, so the database has something to serve. Does nothing
 * once any revision exists.
 *
 * Until this runs, /api/reflection/tree falls back to the tree compiled into the
 * build, so the app works either way -- seeding is what makes the tree editable
 * without a redeploy.
 *
 * The checks below are a sanity pass on the file, not the real validation:
 * validateReflectionTree in app/lib/reflectionTree.ts is enforced when a
 * revision is read and when one is published.
 *
 * Dry run by default. Pass --apply to write.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or POSTGRES_URL is required to seed the reflection tree.");
}

const shouldApply = process.argv.includes("--apply");
const actorEmail = process.env.DESKCAT_ADMIN_EMAIL ?? "seed-script";
const sql = neon(databaseUrl);

const treePath = path.join(process.cwd(), "app", "data", "reflectionTree.json");
const document = JSON.parse(await fs.readFile(treePath, "utf8"));

if (document.version !== 2) {
  throw new Error(`Expected a version 2 reflection tree, found version ${document.version}.`);
}
if (!document.nodes?.[document.start]) {
  throw new Error(`Start node "${document.start}" is missing from the tree.`);
}
for (const [nodeId, node] of Object.entries(document.nodes)) {
  for (const answer of node.answers) {
    if (answer.next != null && !document.nodes[answer.next]) {
      throw new Error(`Node "${nodeId}" leads to "${answer.next}", which does not exist.`);
    }
  }
}

const existing = await sql`
  SELECT revision, status, label, published_at
  FROM reflection_tree_revisions
  ORDER BY revision DESC
  LIMIT 1
`;

if (existing.length > 0) {
  const [row] = existing;
  console.log(`reflection_tree_revisions already holds revision ${row.revision} (${row.status}). Nothing to seed.`);
  process.exit(0);
}

const nodeCount = Object.keys(document.nodes).length;
const answerCount = Object.values(document.nodes).reduce((total, node) => total + node.answers.length, 0);

console.log(`Seeding revision 1 from ${path.relative(process.cwd(), treePath)}: ${nodeCount} nodes, ${answerCount} answers.`);

if (!shouldApply) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

await sql`
  INSERT INTO reflection_tree_revisions (revision, status, label, document, updated_by_email, published_at)
  VALUES (1, 'published', 'Imported from the bundled tree', ${JSON.stringify(document)}::jsonb, ${actorEmail}, now())
`;

await sql`
  INSERT INTO admin_audit_logs (actor_email, action, target_type, target_id, metadata)
  VALUES (${actorEmail}, 'reflection_tree.seed', 'reflection_tree_revision', '1', ${JSON.stringify({ nodeCount, answerCount })}::jsonb)
`;

console.log("Seeded revision 1 as the published reflection tree.");
