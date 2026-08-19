/**
 * Converts app/data/reflectionTree.json from v1 to v2.
 *
 * v1 stored the reflection tree's *meaning* implicitly: `deriveReflectionMetadata`
 * recovered the outcome, focus area, and next focus of a session by pattern-matching
 * node ids and answer text. That made renaming a node a silent break of the stats
 * page, which is unacceptable once an admin can edit the tree from a UI.
 *
 * v2 stores the same meaning as explicit tags on each answer (`outcome`, `area`,
 * `recordAs`, `action`, `description`), so the runtime reads the tags instead of
 * guessing. This script *is* the old inference logic, run once: everything below
 * is lifted from app/lib/reflection.ts and app/reflect/page.tsx as they stood
 * before the migration.
 *
 * Dry run by default. Pass --apply to write.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const treePath = path.join(process.cwd(), "app", "data", "reflectionTree.json");
const shouldApply = process.argv.includes("--apply");

// --- v1 inference rules, verbatim -------------------------------------------

// parseOutcomeFromStartTransition(): the outcome was read off which node the
// answer chosen at `start` led to.
const OUTCOME_BY_START_TARGET = {
  positive_opposite_intro: "overallPositive",
  mixed_pick_first: "overallMixed",
  negative_opposite_intro: "overallNegative"
};

// parseAreaFromNodeId(): any node id ending in good_/bad_ + an area name.
const AREA_NODE_PATTERN = /(?:good|bad)_(productivity|mechanics|creativity)(?:_focus)?$/;

// getAreaDescriptionForLabel(): matched on substrings of the answer label.
const AREA_DESCRIPTIONS = {
  productivity: "How much I was able to get written.",
  mechanics: "The quality and structure of my writing.",
  creativity: "The quality of my ideas and expression."
};

function areaFromLabel(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("productivity")) return "productivity";
  if (normalized.includes("mechanic")) return "mechanics";
  if (normalized.includes("creativity")) return "creativity";
  return null;
}

// --- migration ---------------------------------------------------------------

const source = JSON.parse(await fs.readFile(treePath, "utf8"));

if (source.version === 2) {
  console.log("app/data/reflectionTree.json is already v2. Nothing to do.");
  process.exit(0);
}

const nodes = source.nodes;
const nodeIds = Object.keys(nodes);

// The terminal node is the one whose answers all lead nowhere. v1 hard-coded
// this as the literal id "end" in both reflection.ts and the reflect page.
const terminalIds = nodeIds.filter((id) =>
  nodes[id].answers.length > 0 && nodes[id].answers.every((answer) => answer.next == null)
);

if (terminalIds.length !== 1) {
  throw new Error(
    `Expected exactly one terminal node, found ${terminalIds.length}: ${terminalIds.join(", ") || "none"}`
  );
}

const terminalId = terminalIds[0];
const notes = [];

const migratedNodes = {};

for (const nodeId of nodeIds) {
  const node = nodes[nodeId];
  const isTerminal = nodeId === terminalId;

  const answers = node.answers.map((answer) => {
    const migrated = { label: answer.label, next: answer.next ?? null };

    // outcome: only the start node's answers carried one.
    if (nodeId === source.start) {
      const outcome = OUTCOME_BY_START_TARGET[answer.next];
      if (!outcome) {
        notes.push(`WARN  ${nodeId}: answer "${answer.label}" -> ${answer.next} has no known outcome; it logged "unknown".`);
      } else {
        migrated.outcome = outcome;
      }
    }

    // area: v1 took the first area it could read off a node id along the path,
    // checking the entry's own node first and then the node it led to. Every
    // area node is only ever reached through an edge, so tagging the edges
    // reproduces that exactly, with first-tag-wins at read time.
    const areaMatch = typeof answer.next === "string" ? answer.next.match(AREA_NODE_PATTERN) : null;
    if (areaMatch) migrated.area = areaMatch[1];

    // nextFocus: v1 took the answer on the last path entry that led to `end`.
    if (answer.next === terminalId) migrated.recordAs = "nextFocus";

    // action: the reflect page compared the answer label to the string "Save".
    if (isTerminal) migrated.action = answer.label === "Save" ? "save" : "discard";

    // description: v1 substring-matched the label at render time.
    const labelArea = areaFromLabel(answer.label);
    if (labelArea) {
      migrated.description = AREA_DESCRIPTIONS[labelArea];
      if (!areaMatch) {
        notes.push(`NOTE  ${nodeId}: answer "${answer.label}" showed the ${labelArea} description but tagged no area (it led to ${answer.next}).`);
      }
    }

    return migrated;
  });

  migratedNodes[nodeId] = {
    id: node.id,
    kind: isTerminal ? "terminal" : "question",
    question: node.question,
    answers
  };
}

const document = { version: 2, start: source.start, nodes: migratedNodes };

// --- serialize ---------------------------------------------------------------

// Matches the hand-written style of the v1 file: 2-space indent, one answer per line.
function serialize(doc) {
  const lines = ["{", `  "version": ${doc.version},`, `  "start": ${JSON.stringify(doc.start)},`, `  "nodes": {`];
  const ids = Object.keys(doc.nodes);

  ids.forEach((id, index) => {
    const node = doc.nodes[id];
    lines.push(`    ${JSON.stringify(id)}: {`);
    lines.push(`      "id": ${JSON.stringify(node.id)},`);
    lines.push(`      "kind": ${JSON.stringify(node.kind)},`);
    lines.push(`      "question": ${JSON.stringify(node.question)},`);
    lines.push(`      "answers": [`);
    node.answers.forEach((answer, answerIndex) => {
      const fields = Object.entries(answer).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`);
      const comma = answerIndex === node.answers.length - 1 ? "" : ",";
      lines.push(`        { ${fields.join(", ")} }${comma}`);
    });
    lines.push(`      ]`);
    lines.push(`    }${index === ids.length - 1 ? "" : ","}`);
  });

  lines.push("  }", "}");
  return `${lines.join("\n")}\n`;
}

const serialized = serialize(document);

// --- report ------------------------------------------------------------------

const tagCounts = { outcome: 0, area: 0, recordAs: 0, action: 0, description: 0 };
let answerCount = 0;

for (const node of Object.values(migratedNodes)) {
  for (const answer of node.answers) {
    answerCount += 1;
    for (const key of Object.keys(tagCounts)) {
      if (answer[key] !== undefined) tagCounts[key] += 1;
    }
  }
}

console.log(`Reflection tree: ${nodeIds.length} nodes, ${answerCount} answers. Terminal node: ${terminalId}.`);
console.log("Tags written:");
for (const [key, count] of Object.entries(tagCounts)) {
  console.log(`  ${key.padEnd(12)} ${count}`);
}
if (notes.length > 0) {
  console.log("");
  for (const note of notes) console.log(note);
}

if (!shouldApply) {
  console.log("\nDry run. Pass --apply to write app/data/reflectionTree.json.");
  process.exit(0);
}

const temporaryPath = `${treePath}.tmp`;
await fs.writeFile(temporaryPath, serialized, "utf8");
await fs.rename(temporaryPath, treePath);
console.log("\nWrote app/data/reflectionTree.json at version 2.");
