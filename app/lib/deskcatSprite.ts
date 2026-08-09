import type { StaticImageData } from "next/image";
import catPlaying from "@/art/Images/cat/playing.png";
import catReading from "@/art/Images/cat/reading.png";
import catSleeping from "@/art/Images/cat/sleeping.png";
import catSitting from "@/art/Images/cat/sitting.png";
import catWalking from "@/art/Images/cat/walking.png";
import deskcatLogo from "@/art/Images/logo.png";
import {
  DESKCAT_ANCHOR_DATA,
  type DeskCatAnchorSlotId,
  type DeskCatPoseId,
  type DeskCatPoseLayout
} from "./deskcatAnchors";

export type { DeskCatAnchor, DeskCatAnchorAssetView, DeskCatAnchorSlotId, DeskCatPoseId } from "./deskcatAnchors";

export type DeskCatCosmeticCategory = "head" | "neck" | "tail" | "glasses";
export type DeskCatCosmeticId = string;
export type DeskCatCosmeticSelection = string;
export type DeskCatEquippedCosmetics = Record<DeskCatCosmeticCategory, DeskCatCosmeticSelection>;

export type DeskCatPose = DeskCatPoseLayout & {
  id: DeskCatPoseId;
  src: StaticImageData;
};

export type DeskCatCosmeticCategoryDefinition = {
  id: DeskCatCosmeticCategory;
  label: string;
  description: string;
  anchorSlot: DeskCatAnchorSlotId;
};

export const NONE_DESKCAT_COSMETIC_ID = "none" as const;

export const DESKCAT_COSMETIC_CATEGORIES: readonly DeskCatCosmeticCategoryDefinition[] = [
  { id: "head", label: "Head", description: "Hats and other headwear live here.", anchorSlot: "head" },
  { id: "neck", label: "Neck", description: "Bowties, collars, and anything around DeskCat's neck.", anchorSlot: "neck" },
  { id: "tail", label: "Tail", description: "Tail accessories. Right now this category only has None.", anchorSlot: "tail" },
  { id: "glasses", label: "Glasses", description: "Eyewear and frames for DeskCat.", anchorSlot: "eyes" }
] as const;

export function createDefaultDeskCatCosmetics(): DeskCatEquippedCosmetics {
  return { head: "none", neck: "none", tail: "none", glasses: "none" };
}

export const DEFAULT_DESKCAT_COSMETICS = createDefaultDeskCatCosmetics();

const POSE_IMAGES: Record<DeskCatPoseId, StaticImageData> = {
  logo: deskcatLogo,
  playing: catPlaying,
  reading: catReading,
  sleeping: catSleeping,
  sitting: catSitting,
  walking: catWalking
};

const ALL_DESKCAT_POSES = (Object.keys(POSE_IMAGES) as DeskCatPoseId[]).map((id) => ({
  id,
  src: POSE_IMAGES[id],
  ...DESKCAT_ANCHOR_DATA.poses[id]
}));

export const DESKCAT_STAGE_POSES = ALL_DESKCAT_POSES.filter((pose) => pose.id !== "logo");

export function getDeskCatPose(poseId: DeskCatPoseId): DeskCatPose {
  return ALL_DESKCAT_POSES.find((pose) => pose.id === poseId) ?? ALL_DESKCAT_POSES[1];
}

export function isDeskCatCosmeticId(value: unknown): value is DeskCatCosmeticId {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}
