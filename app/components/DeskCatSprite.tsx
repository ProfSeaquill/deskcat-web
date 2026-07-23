"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  DESKCAT_COSMETIC_CATEGORIES,
  DEFAULT_DESKCAT_COSMETICS,
  NONE_DESKCAT_COSMETIC_ID,
  getDeskCatPose,
  getDeskCatCosmetic,
  type DeskCatEquippedCosmetics,
  type DeskCatPoseId
} from "../lib/deskcatSprite";
import type { DeskCatPoseLayout } from "../lib/deskcatAnchors";

type DeskCatSpriteProps = {
  poseId: DeskCatPoseId;
  cosmetics?: DeskCatEquippedCosmetics;
  alt: string;
  priority?: boolean;
  sizes?: string;
  layoutOverride?: DeskCatPoseLayout;
  applyStageTransform?: boolean;
  overlay?: ReactNode;
};

export default function DeskCatSprite({
  poseId,
  cosmetics = DEFAULT_DESKCAT_COSMETICS,
  alt,
  priority = false,
  sizes = "184px",
  layoutOverride,
  applyStageTransform = true,
  overlay
}: DeskCatSpriteProps) {
  const pose = getDeskCatPose(poseId);
  const layout = layoutOverride ?? pose;
  const equippedCosmetics = DESKCAT_COSMETIC_CATEGORIES.flatMap(({ id: category }) => {
    const selection = cosmetics[category];
    if (selection === NONE_DESKCAT_COSMETIC_ID) return [];

    const cosmetic = getDeskCatCosmetic(selection);
    const slotAnchor = layout.anchors[cosmetic.anchorSlot];
    if (!slotAnchor || slotAnchor.visible === false) return [];
    const anchor = layout.cosmeticAnchors?.[cosmetic.id] ?? slotAnchor;
    if (!anchor || anchor.visible === false) return [];
    const assetView = anchor?.assetView ?? "front";
    const asset = cosmetic.renderSrcByView?.[assetView] ?? cosmetic.poseRenderSrc?.[pose.id] ?? cosmetic.renderSrc;
    return asset ? [{ cosmetic, anchor, asset }] : [];
  });

  const stageTransform = applyStageTransform
    ? `translate(${layout.stage.x}px, ${layout.stage.y}px) scale(${layout.stage.scale})`
    : undefined;
  const cutoutLayers = layout.cutoutLayers?.filter((layer) => layer.visible !== false) ?? [];

  return (
    <div className="relative isolate h-full w-full">
      <div
        className="absolute inset-0"
        style={{ transform: stageTransform, transformOrigin: "50% 100%" }}
      >
        <Image
          src={pose.src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder="blur"
          className="pointer-events-none object-contain"
          style={{ zIndex: 0 }}
        />

        {cutoutLayers.map((layer) => (
          <Image
            key={layer.id}
            src={pose.src}
            alt=""
            aria-hidden="true"
            fill
            sizes={sizes}
            priority={priority}
            placeholder="blur"
            className="pointer-events-none object-contain"
            style={{
              clipPath: `polygon(${layer.points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(", ")})`,
              transform: `translate(${layer.offsetX * 100}%, ${layer.offsetY * 100}%) scaleX(${layer.flipX ? -1 : 1})`,
              zIndex: layer.zIndex
            }}
          />
        ))}

        {equippedCosmetics.map(({ cosmetic, anchor, asset }) => (
          <Image
            key={cosmetic.id}
            src={asset}
            alt=""
            aria-hidden="true"
            width={asset.width}
            height={asset.height}
            sizes={sizes}
            className="pointer-events-none absolute"
            style={{
              left: `${(anchor.x + cosmetic.offsetX) * 100}%`,
              top: `${(anchor.y + cosmetic.offsetY) * 100}%`,
              width: `${anchor.width * cosmetic.scale * 100}%`,
              height: `${(anchor.height ?? anchor.width) * cosmetic.scale * 100}%`,
              transform: `translate(-50%, -50%) rotate(${anchor.rotation + cosmetic.rotationOffset}deg) scaleX(${anchor.flipX ? -1 : 1})`,
              zIndex: anchor.zIndex,
              objectFit: "contain"
            }}
          />
        ))}

        {overlay}
      </div>
    </div>
  );
}
