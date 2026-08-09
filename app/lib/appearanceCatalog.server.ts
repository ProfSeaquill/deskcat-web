import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../db";
import {
  appearanceBackgrounds,
  cosmeticAssets,
  cosmeticPosePlacements,
  cosmetics
} from "../db/schema";
import {
  buildBackgroundTheme,
  type AppearanceCatalog,
  type ManagedCosmetic,
  type ManagedImageAsset
} from "./appearanceCatalog";
import type { DeskCatAnchor, DeskCatPoseId } from "./deskcatAnchors";

function publicAsset(asset: {
  id: string;
  width: number;
  height: number;
}): ManagedImageAsset {
  return {
    id: asset.id,
    src: `/api/appearance/assets/${asset.id}`,
    width: asset.width,
    height: asset.height
  };
}

function latestRevision(values: Date[], counts: number[]) {
  const latest = values.reduce((current, value) => Math.max(current, value.getTime()), 0);
  return `${latest || 0}:${counts.join(":")}`;
}

export async function loadPublicAppearanceCatalog(): Promise<AppearanceCatalog> {
  const db = getDb();
  const [assetRows, placementRows, backgroundRows] = await Promise.all([
    db
      .select({
        cosmetic: cosmetics,
        asset: cosmeticAssets
      })
      .from(cosmeticAssets)
      .innerJoin(cosmetics, eq(cosmeticAssets.cosmeticId, cosmetics.id))
      .where(
        and(
          eq(cosmeticAssets.accessible, true),
          ne(cosmetics.status, "retired")
        )
      )
      .orderBy(asc(cosmetics.sortOrder), asc(cosmetics.label), desc(cosmeticAssets.createdAt)),
    db
      .select({
        cosmeticId: cosmeticPosePlacements.cosmeticId,
        poseId: cosmeticPosePlacements.poseId,
        x: cosmeticPosePlacements.x,
        y: cosmeticPosePlacements.y,
        width: cosmeticPosePlacements.width,
        height: cosmeticPosePlacements.height,
        rotation: cosmeticPosePlacements.rotation,
        zIndex: cosmeticPosePlacements.zIndex,
        assetView: cosmeticPosePlacements.assetView,
        flipX: cosmeticPosePlacements.flipX,
        visible: cosmeticPosePlacements.visible,
        updatedAt: cosmeticPosePlacements.updatedAt
      })
      .from(cosmeticPosePlacements)
      .innerJoin(cosmetics, eq(cosmeticPosePlacements.cosmeticId, cosmetics.id))
      .where(ne(cosmetics.status, "retired")),
    db
      .select()
      .from(appearanceBackgrounds)
      .where(eq(appearanceBackgrounds.accessible, true))
      .orderBy(asc(appearanceBackgrounds.sortOrder), asc(appearanceBackgrounds.label))
  ]);

  type CosmeticDraft = Omit<ManagedCosmetic, "previewSrc" | "renderSrc"> & {
    previewSrc?: ManagedImageAsset;
    renderSrc?: ManagedImageAsset;
    firstAsset?: ManagedImageAsset;
    sortOrder: number;
    updatedAt: Date;
  };

  const cosmeticDrafts = new Map<string, CosmeticDraft>();

  for (const { cosmetic, asset } of assetRows) {
    let draft = cosmeticDrafts.get(cosmetic.id);
    if (!draft) {
      draft = {
        id: cosmetic.id,
        label: cosmetic.label,
        description: cosmetic.description,
        category: cosmetic.category,
        anchorSlot: cosmetic.anchorSlot,
        renderSrcByView: {},
        poseRenderSrc: {},
        poseAnchors: {},
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotationOffset: 0,
        sortOrder: cosmetic.sortOrder,
        updatedAt: cosmetic.updatedAt
      };
      cosmeticDrafts.set(cosmetic.id, draft);
    }

    const image = publicAsset(asset);
    draft.firstAsset ??= image;
    if (asset.updatedAt > draft.updatedAt) draft.updatedAt = asset.updatedAt;

    if (asset.purpose === "preview") {
      draft.previewSrc ??= image;
    } else if (asset.poseId) {
      draft.poseRenderSrc[asset.poseId] ??= image;
    } else if (asset.assetView) {
      draft.renderSrcByView[asset.assetView] ??= image;
    } else {
      draft.renderSrc ??= image;
    }
  }

  for (const placement of placementRows) {
    const draft = cosmeticDrafts.get(placement.cosmeticId);
    if (!draft) continue;

    const anchor: DeskCatAnchor = {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height ?? undefined,
      rotation: placement.rotation,
      zIndex: placement.zIndex,
      assetView: placement.assetView,
      flipX: placement.flipX,
      visible: placement.visible
    };
    draft.poseAnchors[placement.poseId as DeskCatPoseId] = anchor;
    if (placement.updatedAt > draft.updatedAt) draft.updatedAt = placement.updatedAt;
  }

  const managedCosmetics = Array.from(cosmeticDrafts.values())
    .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label))
    .flatMap((draft): ManagedCosmetic[] => {
      const firstPoseAsset = Object.values(draft.poseRenderSrc)[0];
      const renderSrc =
        draft.renderSrc ??
        draft.renderSrcByView.front ??
        draft.renderSrcByView.threeQuarter ??
        firstPoseAsset ??
        draft.previewSrc ??
        draft.firstAsset;
      const previewSrc = draft.previewSrc ?? renderSrc;
      if (!renderSrc || !previewSrc) return [];

      return [
        {
          id: draft.id,
          label: draft.label,
          description: draft.description,
          category: draft.category,
          anchorSlot: draft.anchorSlot,
          previewSrc,
          renderSrc,
          renderSrcByView: draft.renderSrcByView,
          poseRenderSrc: draft.poseRenderSrc,
          poseAnchors: draft.poseAnchors,
          scale: draft.scale,
          offsetX: draft.offsetX,
          offsetY: draft.offsetY,
          rotationOffset: draft.rotationOffset
        }
      ];
    });

  const backgrounds = backgroundRows.map((background) =>
    buildBackgroundTheme({
      id: background.id,
      label: background.label,
      description: background.description,
      background: background.background,
      foreground: background.foreground,
      accent: background.accent,
      border: background.border,
      swatches: background.swatches,
      surfaceMode: background.surfaceMode
    })
  );

  return {
    revision: latestRevision(
      [
        ...Array.from(cosmeticDrafts.values(), (draft) => draft.updatedAt),
        ...backgroundRows.map((background) => background.updatedAt)
      ],
      [managedCosmetics.length, assetRows.length, placementRows.length, backgrounds.length]
    ),
    cosmetics: managedCosmetics,
    backgrounds
  };
}
