import {
  DESKCAT_ANCHOR_DATA,
  DESKCAT_POSE_IDS,
  type DeskCatAnchor,
  type DeskCatAnchorDocument,
  type DeskCatAnchorAssetView,
  type DeskCatAnchorSlotId,
  type DeskCatPoseId
} from "./deskcatAnchors";

export const POSE_LABELS: Record<DeskCatPoseId, string> = {
  logo: "Logo",
  playing: "Playing",
  reading: "Reading",
  sleeping: "Sleeping",
  sitting: "Sitting",
  walking: "Walking"
};

export const ASSET_VIEW_LABELS: Record<DeskCatAnchorAssetView, string> = {
  front: "Front",
  threeQuarter: "3/4"
};

/**
 * Trailing view tokens we accept in source filenames, e.g. `red_bowtie_3:4.png`
 * or `red-glasses-front.png`. A separator before the token is required so that
 * names ending in the letters by coincidence (`confront.png`) are left alone.
 */
const VIEW_SUFFIX_PATTERNS: { view: DeskCatAnchorAssetView; pattern: RegExp }[] = [
  { view: "threeQuarter", pattern: /[\s_-]+(?:3[\s:_-]?4|three[\s_-]?quarters?|3q)$/i },
  { view: "front", pattern: /[\s_-]+front$/i }
];

export type ParsedAssetFileName = {
  baseName: string;
  assetView: "" | DeskCatAnchorAssetView;
};

/**
 * Splits a source filename into the cosmetic's base name and the view variant
 * it represents, so that `red_bowtie_front.png` and `red_bowtie_3:4.png` both
 * resolve to the single cosmetic "Red Bowtie" rather than two of them.
 */
export function parseAssetFileName(fileName: string): ParsedAssetFileName {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");

  for (const { view, pattern } of VIEW_SUFFIX_PATTERNS) {
    const stripped = withoutExtension.replace(pattern, "");
    if (stripped !== withoutExtension && stripped.trim().length > 0) {
      return { baseName: prettifyName(stripped), assetView: view };
    }
  }

  return { baseName: prettifyName(withoutExtension), assetView: "" };
}

function prettifyName(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type PoseAssetViewUsage = {
  poseId: DeskCatPoseId;
  assetView: DeskCatAnchorAssetView;
  visible: boolean;
};

/**
 * Mirrors the anchor resolution in DeskCatSprite: the published per-cosmetic
 * override wins, followed by a legacy database pose placement and then the
 * shared slot anchor. An override replaces the slot anchor outright, so an
 * override without an `assetView` falls back to "front".
 */
export function resolvePoseAssetViews(
  cosmeticId: string,
  anchorSlot: DeskCatAnchorSlotId,
  anchorDocument: DeskCatAnchorDocument = DESKCAT_ANCHOR_DATA,
  placements: Partial<Record<DeskCatPoseId, DeskCatAnchor>> = {}
): PoseAssetViewUsage[] {
  return DESKCAT_POSE_IDS.map((poseId) => {
    const layout = anchorDocument.poses[poseId];
    const slotAnchor = layout?.anchors[anchorSlot];
    const anchor = layout?.cosmeticAnchors?.[cosmeticId] ?? placements[poseId] ?? slotAnchor;
    const visible =
      Boolean(slotAnchor) &&
      slotAnchor?.visible !== false &&
      Boolean(anchor) &&
      anchor?.visible !== false;

    return {
      poseId,
      assetView: anchor?.assetView ?? "front",
      visible
    };
  });
}

/**
 * Which poses actually draw each view for a cosmetic, so the asset manager can
 * say "this 3/4 file is what Playing and Walking use".
 */
export function groupPosesByAssetView(
  cosmeticId: string,
  anchorSlot: DeskCatAnchorSlotId,
  anchorDocument: DeskCatAnchorDocument = DESKCAT_ANCHOR_DATA,
  placements: Partial<Record<DeskCatPoseId, DeskCatAnchor>> = {}
): Record<DeskCatAnchorAssetView, DeskCatPoseId[]> {
  const grouped: Record<DeskCatAnchorAssetView, DeskCatPoseId[]> = {
    front: [],
    threeQuarter: []
  };

  for (const usage of resolvePoseAssetViews(cosmeticId, anchorSlot, anchorDocument, placements)) {
    if (!usage.visible) continue;
    grouped[usage.assetView].push(usage.poseId);
  }

  return grouped;
}

export function formatPoseList(poseIds: DeskCatPoseId[]) {
  return poseIds.map((poseId) => POSE_LABELS[poseId]).join(", ");
}
