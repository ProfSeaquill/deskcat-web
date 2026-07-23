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
export type DeskCatAnchorAssetView = "front" | "threeQuarter";

export type DeskCatAnchor = {
  x: number;
  y: number;
  width: number;
  height?: number;
  rotation: number;
  zIndex: number;
  assetView?: DeskCatAnchorAssetView;
  flipX?: boolean;
  visible?: boolean;
};

export type DeskCatStageTransform = {
  scale: number;
  x: number;
  y: number;
};

export type DeskCatCutoutPoint = {
  x: number;
  y: number;
};

export type DeskCatCutoutLayer = {
  id: string;
  label: string;
  points: DeskCatCutoutPoint[];
  offsetX: number;
  offsetY: number;
  zIndex: number;
  visible?: boolean;
  flipX?: boolean;
};

export type DeskCatPoseLayout = {
  stage: DeskCatStageTransform;
  anchors: Record<DeskCatAnchorSlotId, DeskCatAnchor>;
  cosmeticAnchors?: Record<string, DeskCatAnchor>;
  cutoutLayers?: DeskCatCutoutLayer[];
};

export type DeskCatAnchorDocument = {
  version: 1;
  poses: Record<DeskCatPoseId, DeskCatPoseLayout>;
};

export const DESKCAT_ANCHOR_DATA = anchorData as DeskCatAnchorDocument;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateAnchor(anchor: Partial<DeskCatAnchor>, path: string, errors: string[]) {
  if (!isFiniteNumber(anchor.x) || anchor.x < 0 || anchor.x > 1) {
    errors.push(`${path}.x must be between 0 and 1.`);
  }
  if (!isFiniteNumber(anchor.y) || anchor.y < 0 || anchor.y > 1) {
    errors.push(`${path}.y must be between 0 and 1.`);
  }
  if (!isFiniteNumber(anchor.width) || anchor.width <= 0 || anchor.width > 1) {
    errors.push(`${path}.width must be greater than 0 and at most 1.`);
  }
  if (anchor.height !== undefined && (!isFiniteNumber(anchor.height) || anchor.height <= 0 || anchor.height > 1)) {
    errors.push(`${path}.height must be greater than 0 and at most 1.`);
  }
  if (!isFiniteNumber(anchor.rotation) || Math.abs(anchor.rotation) > 360) {
    errors.push(`${path}.rotation must be between -360 and 360.`);
  }
  if (typeof anchor.zIndex !== "number" || !Number.isInteger(anchor.zIndex) || anchor.zIndex < -10 || anchor.zIndex > 10) {
    errors.push(`${path}.zIndex must be an integer between -10 and 10.`);
  }
  if (anchor.assetView !== undefined && anchor.assetView !== "front" && anchor.assetView !== "threeQuarter") {
    errors.push(`${path}.assetView must be front or threeQuarter.`);
  }
  if (anchor.flipX !== undefined && typeof anchor.flipX !== "boolean") {
    errors.push(`${path}.flipX must be true or false.`);
  }
  if (anchor.visible !== undefined && typeof anchor.visible !== "boolean") {
    errors.push(`${path}.visible must be true or false.`);
  }
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

    if (pose.cutoutLayers !== undefined) {
      if (!Array.isArray(pose.cutoutLayers)) {
        errors.push(`Pose ${poseId} cutoutLayers must be an array.`);
      } else {
        for (const layer of pose.cutoutLayers) {
          if (!layer || typeof layer !== "object") {
            errors.push(`Pose ${poseId} contains an invalid cutout layer.`);
            continue;
          }
          if (typeof layer.id !== "string" || layer.id.trim().length === 0) {
            errors.push(`Pose ${poseId} contains a cutout layer without an id.`);
          }
          if (typeof layer.label !== "string" || layer.label.trim().length === 0) {
            errors.push(`Pose ${poseId} contains a cutout layer without a label.`);
          }
          if (!Array.isArray(layer.points) || layer.points.length < 3) {
            errors.push(`${poseId}.${layer.id}.points must contain at least 3 points.`);
          } else {
            for (const point of layer.points) {
              if (!isFiniteNumber(point.x) || point.x < 0 || point.x > 1 || !isFiniteNumber(point.y) || point.y < 0 || point.y > 1) {
                errors.push(`${poseId}.${layer.id}.points must use normalized x/y values between 0 and 1.`);
                break;
              }
            }
          }
          if (!isFiniteNumber(layer.offsetX) || !isFiniteNumber(layer.offsetY)) {
            errors.push(`${poseId}.${layer.id}.offset must be finite.`);
          }
          if (!Number.isInteger(layer.zIndex) || layer.zIndex < -10 || layer.zIndex > 10) {
            errors.push(`${poseId}.${layer.id}.zIndex must be an integer between -10 and 10.`);
          }
          if (layer.visible !== undefined && typeof layer.visible !== "boolean") {
            errors.push(`${poseId}.${layer.id}.visible must be true or false.`);
          }
          if (layer.flipX !== undefined && typeof layer.flipX !== "boolean") {
            errors.push(`${poseId}.${layer.id}.flipX must be true or false.`);
          }
        }
      }
    }

    if (pose.cosmeticAnchors !== undefined) {
      if (!pose.cosmeticAnchors || typeof pose.cosmeticAnchors !== "object" || Array.isArray(pose.cosmeticAnchors)) {
        errors.push(`Pose ${poseId} cosmeticAnchors must be an object.`);
      } else {
        for (const [cosmeticId, cosmeticAnchor] of Object.entries(pose.cosmeticAnchors)) {
          if (!cosmeticAnchor || typeof cosmeticAnchor !== "object") {
            errors.push(`${poseId}.cosmeticAnchors.${cosmeticId} must be an anchor object.`);
            continue;
          }
          validateAnchor(cosmeticAnchor, `${poseId}.cosmeticAnchors.${cosmeticId}`, errors);
        }
      }
    }

    for (const slotId of DESKCAT_ANCHOR_SLOT_IDS) {
      const anchor = pose.anchors?.[slotId];
      if (!anchor) {
        errors.push(`Pose ${poseId} is missing its ${slotId} anchor.`);
        continue;
      }
      validateAnchor(anchor, `${poseId}.${slotId}`, errors);
    }
  }

  return errors;
}
