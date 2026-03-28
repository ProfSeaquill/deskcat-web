import type { SessionLog } from "./storage";

export const OUTCOME_LABELS: Record<string, string> = {
  overallPositive: "Positive",
  overallMixed: "Mixed",
  overallNegative: "Rough",
  unknown: "Unknown"
};

export const AREA_LABELS: Record<string, string> = {
  productivity: "Productivity",
  mechanics: "Mechanics",
  creativity: "Creativity"
};

export const AREA_DESCRIPTIONS: Record<string, string> = {
  productivity: "How much I was able to get written.",
  mechanics: "The quality and structure of my writing.",
  creativity: "The quality of my ideas and expression."
};

function parseOutcomeFromStartTransition(nextNodeId?: string | null) {
  switch (nextNodeId) {
    case "positive_opposite_intro":
      return "overallPositive";
    case "mixed_pick_first":
      return "overallMixed";
    case "negative_opposite_intro":
      return "overallNegative";
    default:
      return "unknown";
  }
}

function parseAreaFromNodeId(nodeId?: string | null) {
  if (!nodeId) return undefined;

  const match = nodeId.match(/(?:good|bad)_(productivity|mechanics|creativity)(?:_focus)?$/);
  return match?.[1];
}

export function deriveReflectionMetadata(path: SessionLog["reflectionPath"]) {
  const start = path.find((entry) => entry.nodeId === "start");
  const outcome = parseOutcomeFromStartTransition(start?.nextNodeId);

  const focusArea =
    path
      .map((entry) => parseAreaFromNodeId(entry.nodeId) ?? parseAreaFromNodeId(entry.nextNodeId))
      .find(Boolean) ?? undefined;

  const finalFocus =
    [...path].reverse().find((entry) => entry.nextNodeId === "end")?.answer ?? undefined;

  return {
    outcome,
    focusArea,
    nextFocus: finalFocus
  };
}

export function getOutcomeLabel(outcome?: string) {
  return OUTCOME_LABELS[outcome ?? "unknown"] ?? OUTCOME_LABELS.unknown;
}

export function getAreaLabel(area?: string) {
  if (!area) return undefined;
  return AREA_LABELS[area] ?? area;
}

export function getAreaDescriptionForLabel(label?: string) {
  if (!label) return undefined;

  const normalized = label.toLowerCase();

  if (normalized.includes("productivity")) return AREA_DESCRIPTIONS.productivity;
  if (normalized.includes("mechanic")) return AREA_DESCRIPTIONS.mechanics;
  if (normalized.includes("creativity")) return AREA_DESCRIPTIONS.creativity;

  return undefined;
}
