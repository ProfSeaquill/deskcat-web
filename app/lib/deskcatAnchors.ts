import anchorData from "../data/deskcatAnchors.json";

export const DESKCAT_POSE_IDS = [
  "logo",
  "playing",
  "reading",
  "sleeping",
  "sitting",
  "walking"
] as const;

export const DESKCAT_ANCHOR_SLOT_IDS = ["eyes", "head", "neck", "tail"] as const;

export type DeskCatPoseId = (typeof DESKCAT_POSE_IDS)[number];
export type DeskCatAnchorSlotId = (typeof DESKCAT_ANCHOR_SLOT_IDS)[number];

export type DeskCatAnchor = {
  x: number;
  y: number;
  width: number;
  rotation: number;
  zIndex: number;
};

export type DeskCatStageTransform = {
  scale: number;
  x: number;
  y: number;
};

export type DeskCatPoseLayout = {
  stage: DeskCatStageTransform;
  anchors: Record<DeskCatAnchorSlotId, DeskCatAnchor>;
};

export type DeskCatAnchorDocument = {
  version: 1;
  poses: Record<DeskCatPoseId, DeskCatPoseLayout>;
};

export const DESKCAT_ANCHOR_DATA = anchorData as DeskCatAnchorDocument;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateDeskCatAnchorDocument(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["Anchor document must be an object."];

  const document = value as Partial<DeskCatAnchorDocument>;
  if (document.version !== 1) errors.push("Anchor document version must be 1.");
  if (!document.poses || typeof document.poses !== "object") {
    return [...errors, "Anchor document must contain poses."];
  }

  for (const poseId of DESKCAT_POSE_IDS) {
    const pose = document.poses[poseId];
    if (!pose || typeof pose !== "object") {
      errors.push(`Pose ${poseId} is missing.`);
      continue;
    }

    const stage = pose.stage;
    if (!stage || !isFiniteNumber(stage.scale) || stage.scale <= 0 || stage.scale > 3) {
      errors.push(`Pose ${poseId} has an invalid stage scale.`);
    }
    if (!stage || !isFiniteNumber(stage.x) || !isFiniteNumber(stage.y)) {
      errors.push(`Pose ${poseId} has an invalid stage position.`);
    }

    for (const slotId of DESKCAT_ANCHOR_SLOT_IDS) {
      const anchor = pose.anchors?.[slotId];
      if (!anchor) {
        errors.push(`Pose ${poseId} is missing its ${slotId} anchor.`);
        continue;
      }
      if (!isFiniteNumber(anchor.x) || anchor.x < 0 || anchor.x > 1) {
        errors.push(`${poseId}.${slotId}.x must be between 0 and 1.`);
      }
      if (!isFiniteNumber(anchor.y) || anchor.y < 0 || anchor.y > 1) {
        errors.push(`${poseId}.${slotId}.y must be between 0 and 1.`);
      }
      if (!isFiniteNumber(anchor.width) || anchor.width <= 0 || anchor.width > 1) {
        errors.push(`${poseId}.${slotId}.width must be greater than 0 and at most 1.`);
      }
      if (!isFiniteNumber(anchor.rotation) || Math.abs(anchor.rotation) > 360) {
        errors.push(`${poseId}.${slotId}.rotation must be between -360 and 360.`);
      }
      if (!Number.isInteger(anchor.zIndex) || anchor.zIndex < -10 || anchor.zIndex > 10) {
        errors.push(`${poseId}.${slotId}.zIndex must be an integer between -10 and 10.`);
      }
    }
  }

  return errors;
}
