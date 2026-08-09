import type { StaticImageData } from "next/image";
import defaultGlasses from "@/art/Images/Accessories/Glasses/glasses_default.png";
import type {
  DeskCatAnchor,
  DeskCatAnchorAssetView,
  DeskCatAnchorSlotId,
  DeskCatPoseId
} from "./deskcatAnchors";
import {
  DEFAULT_DESKCAT_GLASSES_ID,
  type DeskCatCosmeticCategory
} from "./deskcatSprite";

export type ManagedImageAsset = {
  id: string;
  src: string | StaticImageData;
  width: number;
  height: number;
};

export type ManagedCosmetic = {
  id: string;
  label: string;
  description: string;
  category: DeskCatCosmeticCategory;
  anchorSlot: DeskCatAnchorSlotId;
  previewSrc: ManagedImageAsset;
  renderSrc: ManagedImageAsset;
  renderSrcByView: Partial<Record<DeskCatAnchorAssetView, ManagedImageAsset>>;
  poseRenderSrc: Partial<Record<DeskCatPoseId, ManagedImageAsset>>;
  poseAnchors: Partial<Record<DeskCatPoseId, DeskCatAnchor>>;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotationOffset: number;
};

export type BackgroundSurfaceMode = "dark" | "light";

export type BackgroundTheme = {
  id: string;
  label: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  border: string;
  swatches: string[];
  surfaceMode: BackgroundSurfaceMode;
  surface: string;
  surfaceStrong: string;
  subsurface: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  link: string;
  linkHover: string;
  buttonPrimaryBackground: string;
  buttonPrimaryText: string;
  buttonPrimaryBorder: string;
  buttonSecondaryBackground: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  inputBackground: string;
  inputText: string;
  inputBorder: string;
  bubbleBackground: string;
  bubbleBorder: string;
  bubbleText: string;
  shadow: string;
};

export type AppearanceCatalog = {
  revision: string;
  cosmetics: ManagedCosmetic[];
  backgrounds: BackgroundTheme[];
};

export type BackgroundThemeRecord = Pick<
  BackgroundTheme,
  | "id"
  | "label"
  | "description"
  | "background"
  | "foreground"
  | "accent"
  | "border"
  | "swatches"
  | "surfaceMode"
>;

const DARK_SURFACE_THEME = {
  surface: "rgba(10, 14, 22, 0.78)",
  surfaceStrong: "rgba(15, 21, 34, 0.96)",
  subsurface: "rgba(17, 25, 43, 0.94)",
  surfaceBorder: "rgba(122, 185, 230, 0.26)",
  textPrimary: "#edf4ff",
  textSecondary: "rgba(237, 244, 255, 0.76)",
  textTertiary: "rgba(237, 244, 255, 0.58)",
  link: "#a9dcff",
  linkHover: "#d8f1ff",
  buttonPrimaryBackground: "#05070b",
  buttonPrimaryText: "#ffffff",
  buttonPrimaryBorder: "rgba(255, 255, 255, 0.18)",
  buttonSecondaryBackground: "rgba(5, 7, 11, 0.94)",
  buttonSecondaryText: "#edf4ff",
  buttonSecondaryBorder: "rgba(255, 255, 255, 0.14)",
  inputBackground: "rgba(8, 12, 20, 0.94)",
  inputText: "#edf4ff",
  inputBorder: "rgba(122, 185, 230, 0.24)",
  bubbleBackground: "#0f1623e6",
  bubbleBorder: "rgba(122, 185, 230, 0.32)",
  bubbleText: "#edf4ff",
  shadow: "rgba(0, 0, 0, 0.34)"
} as const;

const LIGHT_SURFACE_THEME = {
  surface: "rgba(255, 255, 255, 0.82)",
  surfaceStrong: "#ffffff",
  subsurface: "#f8fafc",
  surfaceBorder: "rgba(255, 255, 255, 0.68)",
  textPrimary: "#172033",
  textSecondary: "#5d6879",
  textTertiary: "#7d8797",
  link: "#0f6a98",
  linkHover: "#0a587d",
  buttonPrimaryBackground: "#020617",
  buttonPrimaryText: "#ffffff",
  buttonPrimaryBorder: "rgba(255, 255, 255, 0.18)",
  buttonSecondaryBackground: "#eff6ff",
  buttonSecondaryText: "#075985",
  buttonSecondaryBorder: "#bfdbfe",
  inputBackground: "#ffffff",
  inputText: "#172033",
  inputBorder: "#cbd5e1",
  bubbleBackground: "#fffdf8e6",
  bubbleBorder: "rgba(214, 211, 204, 0.8)",
  bubbleText: "#1c1917",
  shadow: "rgba(15, 23, 42, 0.1)"
} as const;

export const FALLBACK_BACKGROUND_THEME: BackgroundTheme = {
  ...DARK_SURFACE_THEME,
  id: "",
  label: "DeskCat Default",
  description: "The safe fallback used when no managed background is available.",
  background: "linear-gradient(180deg, #06080d 0%, #101725 58%, #1a2436 100%)",
  foreground: "#edf4ff",
  accent: "#7ab9e6",
  border: "rgba(122, 185, 230, 0.34)",
  swatches: ["#05070b", "#111827", "#7ab9e6"],
  surfaceMode: "dark"
};

export const EMPTY_APPEARANCE_CATALOG: AppearanceCatalog = {
  revision: "empty",
  cosmetics: [],
  backgrounds: []
};

const DEFAULT_GLASSES_ASSET: ManagedImageAsset = {
  id: "core-glasses-default",
  src: defaultGlasses,
  width: defaultGlasses.width,
  height: defaultGlasses.height
};

export const DEFAULT_DESKCAT_GLASSES_COSMETIC: ManagedCosmetic = {
  id: DEFAULT_DESKCAT_GLASSES_ID,
  label: "Black Glasses",
  description: "DeskCat's standard black glasses.",
  category: "glasses",
  anchorSlot: "eyes",
  previewSrc: DEFAULT_GLASSES_ASSET,
  renderSrc: DEFAULT_GLASSES_ASSET,
  renderSrcByView: {
    front: DEFAULT_GLASSES_ASSET,
    threeQuarter: DEFAULT_GLASSES_ASSET
  },
  poseRenderSrc: {},
  poseAnchors: {},
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotationOffset: 0
};

export function buildBackgroundTheme(record: BackgroundThemeRecord): BackgroundTheme {
  return {
    ...(record.surfaceMode === "light" ? LIGHT_SURFACE_THEME : DARK_SURFACE_THEME),
    ...record,
    swatches: record.swatches.slice(0, 6)
  };
}

export function getManagedCosmetic(catalog: AppearanceCatalog, cosmeticId: string) {
  if (cosmeticId === DEFAULT_DESKCAT_GLASSES_ID) {
    return DEFAULT_DESKCAT_GLASSES_COSMETIC;
  }
  return catalog.cosmetics.find((cosmetic) => cosmetic.id === cosmeticId) ?? null;
}

export function getManagedCosmeticsForCategory(
  catalog: AppearanceCatalog,
  category: DeskCatCosmeticCategory
) {
  const managedCosmetics = catalog.cosmetics.filter(
    (cosmetic) =>
      cosmetic.category === category && cosmetic.id !== DEFAULT_DESKCAT_GLASSES_ID
  );

  return category === "glasses"
    ? [DEFAULT_DESKCAT_GLASSES_COSMETIC, ...managedCosmetics]
    : managedCosmetics;
}
