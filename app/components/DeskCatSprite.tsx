"use client";

import Image from "next/image";
import {
  getDeskCatCosmetic,
  getDeskCatPose,
  DEFAULT_DESKCAT_COSMETIC_ID,
  type DeskCatCosmeticId,
  type DeskCatPoseId
} from "../lib/deskcatSprite";

type DeskCatSpriteProps = {
  poseId: DeskCatPoseId;
  cosmeticId?: DeskCatCosmeticId;
  alt: string;
  priority?: boolean;
  sizes?: string;
};

export default function DeskCatSprite({
  poseId,
  cosmeticId = DEFAULT_DESKCAT_COSMETIC_ID,
  alt,
  priority = false,
  sizes = "184px"
}: DeskCatSpriteProps) {
  const pose = getDeskCatPose(poseId);
  const cosmetic = getDeskCatCosmetic(cosmeticId);
  const anchor = cosmetic.slot ? pose.anchors[cosmetic.slot] : null;

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pose.stage.x}px, ${pose.stage.y}px) scale(${pose.stage.scale})`,
          transformOrigin: "50% 100%"
        }}
      >
        <Image
          src={pose.src}
          alt={alt}
          fill
          sizes={sizes}
          placeholder="blur"
          priority={priority}
          className="object-contain"
        />

        {cosmetic.slot && anchor && (
          <Image
            src={cosmetic.assetPath}
            alt=""
            aria-hidden="true"
            width={cosmetic.assetWidth}
            height={cosmetic.assetHeight}
            className="pointer-events-none absolute h-auto"
            style={{
              left: `${(anchor.x + cosmetic.offsetX) * 100}%`,
              top: `${(anchor.y + cosmetic.offsetY) * 100}%`,
              width: `${anchor.width * cosmetic.scale * 100}%`,
              transform: `translate(-50%, -50%) rotate(${anchor.rotation + cosmetic.rotationOffset}deg)`,
              zIndex: anchor.zIndex
            }}
          />
        )}
      </div>
    </div>
  );
}
