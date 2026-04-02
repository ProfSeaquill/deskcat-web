import type { StaticImageData } from "next/image";
import catPlaying from "@/art/Images/cat/playing.png";
import catReading from "@/art/Images/cat/reading.png";
import catSleeping from "@/art/Images/cat/sleeping.png";
import catStartled from "@/art/Images/cat/startled.png";
import catWalking from "@/art/Images/cat/walking.png";

export type DeskCatPoseId =
  | "playing"
  | "reading"
  | "sleeping"
  | "startled"
  | "walking";

export type DeskCatCosmeticSlot = "headwear" | "neckwear";

export type DeskCatAnchor = {
  x: number;
  y: number;
  width: number;
  rotation: number;
  zIndex: number;
};

export type DeskCatPose = {
  id: DeskCatPoseId;
  src: StaticImageData;
  stage: {
    scale: number;
    x: number;
    y: number;
  };
  anchors: Partial<Record<DeskCatCosmeticSlot, DeskCatAnchor>>;
};

export type DeskCatCosmeticId = "none" | "red-bowtie";

type EmptyDeskCatCosmetic = {
  id: "none";
  label: string;
  description: string;
  slot: null;
};

type EquippableDeskCatCosmetic = {
  id: Exclude<DeskCatCosmeticId, "none">;
  label: string;
  description: string;
  slot: DeskCatCosmeticSlot;
  assetPath: string;
  assetWidth: number;
  assetHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
};

export type DeskCatCosmetic = EmptyDeskCatCosmetic | EquippableDeskCatCosmetic;

export const DEFAULT_DESKCAT_COSMETIC_ID: DeskCatCosmeticId = "none";

export const DESKCAT_POSES: readonly DeskCatPose[] = [
  {
    id: "playing",
    src: catPlaying,
    stage: { scale: 1.08, x: -6, y: 8 },
    anchors: {
      headwear: { x: 0.76, y: 0.31, width: 0.26, rotation: 12, zIndex: 3 },
      neckwear: { x: 0.63, y: 0.57, width: 0.24, rotation: -18, zIndex: 4 }
    }
  },
  {
    id: "reading",
    src: catReading,
    stage: { scale: 1.04, x: 0, y: 6 },
    anchors: {
      headwear: { x: 0.5, y: 0.23, width: 0.28, rotation: 0, zIndex: 3 },
      neckwear: { x: 0.5, y: 0.55, width: 0.22, rotation: 0, zIndex: 4 }
    }
  },
  {
    id: "sleeping",
    src: catSleeping,
    stage: { scale: 1.1, x: 0, y: 10 },
    anchors: {
      headwear: { x: 0.77, y: 0.32, width: 0.29, rotation: 4, zIndex: 3 },
      neckwear: { x: 0.68, y: 0.57, width: 0.21, rotation: -6, zIndex: 4 }
    }
  },
  {
    id: "startled",
    src: catStartled,
    stage: { scale: 0.98, x: -2, y: 4 },
    anchors: {
      headwear: { x: 0.64, y: 0.24, width: 0.31, rotation: 0, zIndex: 3 },
      neckwear: { x: 0.63, y: 0.55, width: 0.21, rotation: 10, zIndex: 4 }
    }
  },
  {
    id: "walking",
    src: catWalking,
    stage: { scale: 1.06, x: -2, y: 8 },
    anchors: {
      headwear: { x: 0.69, y: 0.25, width: 0.29, rotation: 0, zIndex: 3 },
      neckwear: { x: 0.66, y: 0.56, width: 0.2, rotation: 8, zIndex: 4 }
    }
  }
];

export const DESKCAT_COSMETIC_OPTIONS: readonly DeskCatCosmetic[] = [
  {
    id: "none",
    label: "Nothing Equipped",
    description: "Use the clean base cat with no accessory attached.",
    slot: null
  }
];

export function getDeskCatPose(poseId: DeskCatPoseId) {
  return DESKCAT_POSES.find((pose) => pose.id === poseId) ?? DESKCAT_POSES[0];
}

export function getDeskCatCosmetic(cosmeticId: DeskCatCosmeticId) {
  return (
    DESKCAT_COSMETIC_OPTIONS.find((cosmetic) => cosmetic.id === cosmeticId) ??
    DESKCAT_COSMETIC_OPTIONS[0]
  );
}

export function isDeskCatCosmeticId(value: unknown): value is DeskCatCosmeticId {
  return DESKCAT_COSMETIC_OPTIONS.some((cosmetic) => cosmetic.id === value);
}
