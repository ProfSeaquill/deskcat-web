import type {
  ReflectionAnswer,
  ReflectionNode,
  ReflectionTree
} from "../../lib/reflectionTree";

/**
 * Pure edits on a reflection tree document. Kept apart from the component so each
 * one can be reasoned about (and tested) on its own -- these are the operations
 * that can silently break a tree, renaming especially.
 */

export const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9_]*$/;

function cloneTree(document: ReflectionTree): ReflectionTree {
  return JSON.parse(JSON.stringify(document)) as ReflectionTree;
}

export function inboundCounts(document: ReflectionTree) {
  const counts: Record<string, number> = {};
  for (const nodeId of Object.keys(document.nodes)) counts[nodeId] = 0;

  for (const node of Object.values(document.nodes)) {
    for (const answer of node.answers) {
      if (answer.next && counts[answer.next] !== undefined) counts[answer.next] += 1;
    }
  }

  return counts;
}

export function referrersOf(document: ReflectionTree, nodeId: string) {
  return Object.values(document.nodes)
    .filter((node) => node.id !== nodeId && node.answers.some((answer) => answer.next === nodeId))
    .map((node) => node.id);
}

export function reachableFromStart(document: ReflectionTree) {
  const reachable = new Set<string>();
  const queue = [document.start];

  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (reachable.has(nodeId) || !document.nodes[nodeId]) continue;
    reachable.add(nodeId);
    for (const answer of document.nodes[nodeId].answers) {
      if (answer.next) queue.push(answer.next);
    }
  }

  return reachable;
}

/** Renaming rewrites every `next` that pointed at the old id, and the start pointer. */
export function renameNode(document: ReflectionTree, oldId: string, newId: string): ReflectionTree {
  const next = cloneTree(document);

  // Rebuild in place so the outline order does not jump around after a rename.
  const nodes: Record<string, ReflectionNode> = {};
  for (const [key, node] of Object.entries(next.nodes)) {
    if (key === oldId) nodes[newId] = { ...node, id: newId };
    else nodes[key] = node;
  }

  for (const node of Object.values(nodes)) {
    node.answers = node.answers.map((answer) =>
      answer.next === oldId ? { ...answer, next: newId } : answer
    );
  }

  next.nodes = nodes;
  if (next.start === oldId) next.start = newId;

  return next;
}

export function deleteNode(document: ReflectionTree, nodeId: string): ReflectionTree {
  const next = cloneTree(document);
  delete next.nodes[nodeId];
  return next;
}

export function addNode(document: ReflectionTree): { document: ReflectionTree; nodeId: string } {
  const next = cloneTree(document);

  let index = 1;
  let nodeId = `new_node_${index}`;
  while (next.nodes[nodeId]) {
    index += 1;
    nodeId = `new_node_${index}`;
  }

  next.nodes[nodeId] = {
    id: nodeId,
    kind: "question",
    question: "New question",
    answers: [{ label: "New answer", next: document.start }]
  };

  return { document: next, nodeId };
}

export function updateNode(
  document: ReflectionTree,
  nodeId: string,
  patch: Partial<Omit<ReflectionNode, "id" | "answers">>
): ReflectionTree {
  const next = cloneTree(document);
  next.nodes[nodeId] = { ...next.nodes[nodeId], ...patch };
  return next;
}

/**
 * Switching kind has to keep the document coherent: a terminal node's answers must
 * lead nowhere and must each declare an action, so the edges are cleared and one
 * answer is marked as the save.
 */
export function setNodeKind(
  document: ReflectionTree,
  nodeId: string,
  kind: ReflectionNode["kind"]
): ReflectionTree {
  const next = cloneTree(document);
  const node = next.nodes[nodeId];

  if (kind === "terminal") {
    node.answers = node.answers.map((answer, index) => ({
      ...answer,
      next: null,
      action: index === 0 ? "save" : "discard"
    }));
  } else {
    node.answers = node.answers.map((answer) => {
      const { action, ...rest } = answer;
      void action;
      return { ...rest, next: rest.next ?? null };
    });
  }

  node.kind = kind;
  return next;
}

export function updateAnswer(
  document: ReflectionTree,
  nodeId: string,
  index: number,
  patch: Partial<ReflectionAnswer>
): ReflectionTree {
  const next = cloneTree(document);
  const answer = { ...next.nodes[nodeId].answers[index], ...patch };

  // Undefined means "no tag", and an undefined key would survive a round trip
  // through the database as an explicit null, so drop them instead.
  for (const key of Object.keys(patch) as (keyof ReflectionAnswer)[]) {
    if (patch[key] === undefined) delete answer[key];
  }

  next.nodes[nodeId].answers[index] = answer;
  return next;
}

export function addAnswer(document: ReflectionTree, nodeId: string): ReflectionTree {
  const next = cloneTree(document);
  const node = next.nodes[nodeId];

  node.answers.push(
    node.kind === "terminal"
      ? { label: "New answer", next: null, action: "discard" }
      : { label: "New answer", next: document.start }
  );

  return next;
}

export function removeAnswer(
  document: ReflectionTree,
  nodeId: string,
  index: number
): ReflectionTree {
  const next = cloneTree(document);
  next.nodes[nodeId].answers.splice(index, 1);
  return next;
}

export function moveAnswer(
  document: ReflectionTree,
  nodeId: string,
  index: number,
  delta: number
): ReflectionTree {
  const next = cloneTree(document);
  const answers = next.nodes[nodeId].answers;
  const target = index + delta;

  if (target < 0 || target >= answers.length) return document;

  [answers[index], answers[target]] = [answers[target], answers[index]];
  return next;
}

export function setStartNode(document: ReflectionTree, nodeId: string): ReflectionTree {
  const next = cloneTree(document);
  next.start = nodeId;
  return next;
}
