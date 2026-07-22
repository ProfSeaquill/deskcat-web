import type { StaticImageData } from "next/image";
import redGlassesThreeQuarter from "@/art/Images/Accessories/Glasses/Red Glasses/red_glasses_3:4.png";
import redGlassesFront from "@/art/Images/Accessories/Glasses/Red Glasses/red_glasses_front.png";
import redTopHatThreeQuarter from "@/art/Images/Accessories/Head/Top Hat/red_top hat_3:4.png";
import redTopHatFront from "@/art/Images/Accessories/Head/Top Hat/red_top hat_front.png";
import redBowtieThreeQuarter from "@/art/Images/Accessories/Neck/red_bowtie_3:4.png";
import redBowtieFront from "@/art/Images/Accessories/Neck/red_bowtie_front.png";
import catPlaying from "@/art/Images/cat/playing.png";
import catReading from "@/art/Images/cat/reading.png";
import catSleeping from "@/art/Images/cat/sleeping.png";
import catSitting from "@/art/Images/cat/sitting.png";
import catWalking from "@/art/Images/cat/walking.png";
import deskcatLogo from "@/art/Images/deskcat-logo.png";
import {
  DESKCAT_ANCHOR_DATA,
  type DeskCatAnchorSlotId,
  type DeskCatPoseId,
  type DeskCatPoseLayout
} from "./deskcatAnchors";

export type { DeskCatAnchor, DeskCatAnchorSlotId, DeskCatPoseId } from "./deskcatAnchors";

export type DeskCatCosmeticCategory = "head" | "neck" | "tail" | "glasses";
export type DeskCatCosmeticId = "red-bowtie" | "red-top-hat" | "red-glasses";
export type DeskCatCosmeticSelection = DeskCatCosmeticId | "none";
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

export type DeskCatCosmetic = {
  id: DeskCatCosmeticId;
  label: string;
  description: string;
  category: DeskCatCosmeticCategory;
  anchorSlot: DeskCatAnchorSlotId;
  previewSrc: StaticImageData;
  renderSrc: StaticImageData;
  poseRenderSrc?: Partial<Record<DeskCatPoseId, StaticImageData>>;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
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

export const DESKCAT_COSMETIC_OPTIONS: readonly DeskCatCosmetic[] = [
  {
    id: "red-bowtie", label: "Red Bowtie", description: "A bright red bowtie for DeskCat's neck.",
    category: "neck", anchorSlot: "neck", previewSrc: redBowtieFront, renderSrc: redBowtieThreeQuarter,
    poseRenderSrc: { logo: redBowtieFront, reading: redBowtieFront, sitting: redBowtieFront, sleeping: redBowtieFront, walking: redBowtieFront },
    scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0
  },
  {
    id: "red-top-hat", label: "Red Top Hat", description: "A bright red top hat for DeskCat's head.",
    category: "head", anchorSlot: "head", previewSrc: redTopHatFront, renderSrc: redTopHatThreeQuarter,
    poseRenderSrc: { logo: redTopHatFront, reading: redTopHatFront, sitting: redTopHatFront, sleeping: redTopHatFront, walking: redTopHatFront },
    scale: 1.18, offsetX: 0, offsetY: -0.05, rotationOffset: 0
  },
  {
    id: "red-glasses", label: "Red Glasses", description: "A bright red pair of glasses for DeskCat.",
    category: "glasses", anchorSlot: "eyes", previewSrc: redGlassesFront, renderSrc: redGlassesThreeQuarter,
    poseRenderSrc: { logo: redGlassesFront, reading: redGlassesFront, sitting: redGlassesFront, sleeping: redGlassesFront, walking: redGlassesFront },
    scale: 1, offsetX: 0, offsetY: 0, rotationOffset: 0
  }
];

export function getDeskCatPose(poseId: DeskCatPoseId): DeskCatPose {
  return ALL_DESKCAT_POSES.find((pose) => pose.id === poseId) ?? ALL_DESKCAT_POSES[1];
}

export function getDeskCatCosmetic(cosmeticId: DeskCatCosmeticId) {
  return DESKCAT_COSMETIC_OPTIONS.find((cosmetic) => cosmetic.id === cosmeticId) ?? DESKCAT_COSMETIC_OPTIONS[0];
}

export function getDeskCatCosmeticsForCategory(category: DeskCatCosmeticCategory) {
  return DESKCAT_COSMETIC_OPTIONS.filter((cosmetic) => cosmetic.category === category);
}

export function isDeskCatCosmeticId(value: unknown): value is DeskCatCosmeticId {
  return DESKCAT_COSMETIC_OPTIONS.some((cosmetic) => cosmetic.id === value);
}
