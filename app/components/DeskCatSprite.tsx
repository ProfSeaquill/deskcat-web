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
    const anchor = layout.anchors[cosmetic.anchorSlot];
    const asset = cosmetic.poseRenderSrc?.[pose.id] ?? cosmetic.renderSrc;
    return anchor && asset ? [{ cosmetic, anchor, asset }] : [];
  });

  const stageTransform = applyStageTransform
    ? `translate(${layout.stage.x}px, ${layout.stage.y}px) scale(${layout.stage.scale})`
    : undefined;

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

        {equippedCosmetics.map(({ cosmetic, anchor, asset }) => (
          <Image
            key={cosmetic.id}
            src={asset}
            alt=""
            aria-hidden="true"
            width={asset.width}
            height={asset.height}
            sizes={sizes}
            className="pointer-events-none absolute h-auto"
            style={{
              left: `${(anchor.x + cosmetic.offsetX) * 100}%`,
              top: `${(anchor.y + cosmetic.offsetY) * 100}%`,
              width: `${anchor.width * cosmetic.scale * 100}%`,
              transform: `translate(-50%, -50%) rotate(${anchor.rotation + cosmetic.rotationOffset}deg)`,
              zIndex: anchor.zIndex
            }}
          />
        ))}

        {overlay}
      </div>
    </div>
  );
}
