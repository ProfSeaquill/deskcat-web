import treeData from "../data/reflectionTree.json";

export const REFLECTION_TREE_VERSION = 2;

export const REFLECTION_OUTCOMES = ["overallPositive", "overallMixed", "overallNegative"] as const;
export const REFLECTION_AREAS = ["productivity", "mechanics", "creativity"] as const;
export const REFLECTION_RECORD_SLOTS = ["nextFocus"] as const;
export const REFLECTION_ANSWER_ACTIONS = ["save", "discard"] as const;
export const REFLECTION_NODE_KINDS = ["question", "terminal"] as const;

export type ReflectionOutcome = (typeof REFLECTION_OUTCOMES)[number];
export type ReflectionArea = (typeof REFLECTION_AREAS)[number];
export type ReflectionRecordSlot = (typeof REFLECTION_RECORD_SLOTS)[number];
export type ReflectionAnswerAction = (typeof REFLECTION_ANSWER_ACTIONS)[number];
export type ReflectionNodeKind = (typeof REFLECTION_NODE_KINDS)[number];

/**
 * An answer carries its own meaning. Nothing downstream may infer a session's
 * outcome, focus area, or next focus from a node id or from answer text: those
 * are editable content, and the stats page depends on these tags instead.
 */
export type ReflectionAnswer = {
  label: string;
  next: string | null;
  /** Shown under the label in the reflect UI. */
  description?: string;
  /** Records the session's overall outcome when this answer is chosen. */
  outcome?: ReflectionOutcome;
  /** Records which craft area the session turned on. First one along a path wins. */
  area?: ReflectionArea;
  /** Records this answer's label into the named slot on the session log. */
  recordAs?: ReflectionRecordSlot;
  /** Terminal-node answers only: whether choosing this saves or discards the session. */
  action?: ReflectionAnswerAction;
};

export type ReflectionNode = {
  id: string;
  kind: ReflectionNodeKind;
  question: string;
  answers: ReflectionAnswer[];
};

export type ReflectionTree = {
  version: number;
  start: string;
  nodes: Record<string, ReflectionNode>;
};

export const REFLECTION_TREE = treeData as ReflectionTree;

export type ReflectionTreeReport = {
  errors: string[];
  warnings: string[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isMember<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/**
 * Blocking errors are things that would strand a reader mid-reflection or drop
 * data on the floor. Warnings are shape smells worth surfacing in the editor but
 * not worth refusing to publish over.
 */
export function validateReflectionTree(value: unknown): ReflectionTreeReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!value || typeof value !== "object") {
    return { errors: ["Reflection tree must be an object."], warnings };
  }

  const tree = value as Partial<ReflectionTree>;

  if (tree.version !== REFLECTION_TREE_VERSION) {
    errors.push(`Reflection tree version must be ${REFLECTION_TREE_VERSION}.`);
  }
  if (!tree.nodes || typeof tree.nodes !== "object") {
    return { errors: [...errors, "Reflection tree must contain nodes."], warnings };
  }
  if (!isNonEmptyString(tree.start)) {
    errors.push("Reflection tree must name a start node.");
  }

  const nodes = tree.nodes as Record<string, ReflectionNode>;
  const nodeIds = Object.keys(nodes);

  if (nodeIds.length === 0) {
    return { errors: [...errors, "Reflection tree must contain at least one node."], warnings };
  }
  if (isNonEmptyString(tree.start) && !nodes[tree.start]) {
    errors.push(`Start node "${tree.start}" does not exist.`);
  }

  for (const nodeId of nodeIds) {
    const node = nodes[nodeId];

    if (!node || typeof node !== "object") {
      errors.push(`Node "${nodeId}" is not an object.`);
      continue;
    }
    if (node.id !== nodeId) {
      errors.push(`Node "${nodeId}" has a mismatched id "${String(node.id)}".`);
    }
    if (!isNonEmptyString(node.question)) {
      errors.push(`Node "${nodeId}" is missing a question.`);
    }
    if (!isMember(REFLECTION_NODE_KINDS, node.kind)) {
      errors.push(`Node "${nodeId}" has an unknown kind "${String(node.kind)}".`);
    }
    if (!Array.isArray(node.answers) || node.answers.length === 0) {
      errors.push(`Node "${nodeId}" needs at least one answer.`);
      continue;
    }

    const isTerminal = node.kind === "terminal";
    const seenLabels = new Set<string>();
    let saveAnswers = 0;

    node.answers.forEach((answer, index) => {
      const where = `Node "${nodeId}" answer ${index + 1}`;

      if (!answer || typeof answer !== "object") {
        errors.push(`${where} is not an object.`);
        return;
      }
      if (!isNonEmptyString(answer.label)) {
        errors.push(`${where} is missing a label.`);
      } else if (seenLabels.has(answer.label)) {
        warnings.push(`${where} repeats the label "${answer.label}".`);
      } else {
        seenLabels.add(answer.label);
      }

      if (answer.next === null || answer.next === undefined) {
        if (!isTerminal) {
          errors.push(`${where} leads nowhere, but "${nodeId}" is not a terminal node.`);
        }
      } else if (!isNonEmptyString(answer.next)) {
        errors.push(`${where} has an invalid next node.`);
      } else if (!nodes[answer.next]) {
        errors.push(`${where} leads to "${answer.next}", which does not exist.`);
      } else if (isTerminal) {
        errors.push(`${where} leads onward, but "${nodeId}" is a terminal node.`);
      }

      if (answer.outcome !== undefined && !isMember(REFLECTION_OUTCOMES, answer.outcome)) {
        errors.push(`${where} has an unknown outcome "${String(answer.outcome)}".`);
      }
      if (answer.area !== undefined && !isMember(REFLECTION_AREAS, answer.area)) {
        errors.push(`${where} has an unknown area "${String(answer.area)}".`);
      }
      if (answer.recordAs !== undefined && !isMember(REFLECTION_RECORD_SLOTS, answer.recordAs)) {
        errors.push(`${where} has an unknown recordAs slot "${String(answer.recordAs)}".`);
      }
      if (answer.action !== undefined && !isMember(REFLECTION_ANSWER_ACTIONS, answer.action)) {
        errors.push(`${where} has an unknown action "${String(answer.action)}".`);
      }
      if (answer.action !== undefined && !isTerminal) {
        errors.push(`${where} sets an action, which only terminal nodes may do.`);
      }
      if (answer.action === undefined && isTerminal) {
        errors.push(`${where} needs an action, or choosing it does nothing.`);
      }
      if (answer.action === "save") saveAnswers += 1;
    });

    if (isTerminal && saveAnswers !== 1) {
      errors.push(`Terminal node "${nodeId}" needs exactly one answer with the "save" action.`);
    }
    if (!isTerminal && node.answers.length === 1) {
      warnings.push(`Node "${nodeId}" offers only one answer.`);
    }
  }

  if (errors.length > 0 || !isNonEmptyString(tree.start) || !nodes[tree.start]) {
    return { errors, warnings };
  }

  return { errors: [...errors, ...auditGraph(tree as ReflectionTree)], warnings: [...warnings, ...auditCycles(tree as ReflectionTree)] };
}

function auditGraph(tree: ReflectionTree): string[] {
  const errors: string[] = [];
  const nodes = tree.nodes;

  // Reachable from start.
  const reachable = new Set<string>();
  const queue = [tree.start];
  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const answer of nodes[nodeId].answers) {
      if (answer.next) queue.push(answer.next);
    }
  }

  for (const nodeId of Object.keys(nodes)) {
    if (!reachable.has(nodeId)) {
      errors.push(`Node "${nodeId}" cannot be reached from the start node.`);
    }
  }

  // Every reachable node must still be able to finish.
  const finishes = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const nodeId of reachable) {
      if (finishes.has(nodeId)) continue;
      const node = nodes[nodeId];
      const canFinish =
        node.kind === "terminal" || node.answers.some((answer) => answer.next && finishes.has(answer.next));
      if (canFinish) {
        finishes.add(nodeId);
        changed = true;
      }
    }
  }

  for (const nodeId of reachable) {
    if (!finishes.has(nodeId)) {
      errors.push(`Node "${nodeId}" can never reach a terminal node.`);
    }
  }

  // Every path from start to a terminal must have recorded an outcome, or the
  // stats page logs the session as "unknown". Start optimistic and retract:
  // a node is covered only if every incoming edge arrives already covered.
  const covered = new Map<string, boolean>();
  for (const nodeId of reachable) covered.set(nodeId, nodeId !== tree.start);

  changed = true;
  while (changed) {
    changed = false;
    for (const nodeId of reachable) {
      if (nodeId === tree.start || !covered.get(nodeId)) continue;
      for (const fromId of reachable) {
        const arrives = nodes[fromId].answers.some(
          (answer) => answer.next === nodeId && !(covered.get(fromId) || answer.outcome !== undefined)
        );
        if (arrives) {
          covered.set(nodeId, false);
          changed = true;
          break;
        }
      }
    }
  }

  for (const nodeId of reachable) {
    if (nodes[nodeId].kind === "terminal" && !covered.get(nodeId)) {
      errors.push(`Some paths reach terminal node "${nodeId}" without recording an outcome.`);
    }
  }

  return errors;
}

function auditCycles(tree: ReflectionTree): string[] {
  const warnings: string[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();

  function walk(nodeId: string) {
    if (done.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      warnings.push(`Node "${nodeId}" is part of a loop, so a reflection can revisit it.`);
      return;
    }
    visiting.add(nodeId);
    for (const answer of tree.nodes[nodeId].answers) {
      if (answer.next && tree.nodes[answer.next]) walk(answer.next);
    }
    visiting.delete(nodeId);
    done.add(nodeId);
  }

  walk(tree.start);
  return warnings;
}
