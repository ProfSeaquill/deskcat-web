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

/**
 * Reads a session's metadata off the tags the chosen answers carried, which the
 * reflect page copies onto each path entry as it is walked. Nothing here looks
 * at node ids or answer text: both are admin-editable content, and deriving
 * meaning from them is what made earlier tree edits silently break the stats.
 */
export function deriveReflectionMetadata(path: SessionLog["reflectionPath"]) {
  const outcome = path.find((entry) => entry.outcome)?.outcome ?? "unknown";
  const focusArea = path.find((entry) => entry.area)?.area;
  const nextFocus = [...path].reverse().find((entry) => entry.recordAs === "nextFocus")?.answer;

  return {
    outcome,
    focusArea,
    nextFocus
  };
}

export function getOutcomeLabel(outcome?: string) {
  return OUTCOME_LABELS[outcome ?? "unknown"] ?? OUTCOME_LABELS.unknown;
}

export function getAreaLabel(area?: string) {
  if (!area) return undefined;
  return AREA_LABELS[area] ?? area;
}
