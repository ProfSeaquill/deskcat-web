"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import catPlaying from "@/art/Images/cat/playing.png";
import catReading from "@/art/Images/cat/reading.png";
import catSleeping from "@/art/Images/cat/sleeping.png";
import catStartled from "@/art/Images/cat/startled.png";
import catWalking from "@/art/Images/cat/walking.png";
import { loadLastReaction } from "../lib/storage";
import SpeechBubble from "./SpeechBubble";

type Pose = {
  src: StaticImageData;
  scale: number;
  x: number;
  y: number;
};

const POSES: readonly Pose[] = [
  { src: catPlaying, scale: 1.08, x: -6, y: 8 },
  { src: catReading, scale: 1.04, x: 0, y: 6 },
  { src: catSleeping, scale: 1.1, x: 0, y: 10 },
  { src: catStartled, scale: 0.98, x: -2, y: 4 },
  { src: catWalking, scale: 1.06, x: -2, y: 8 }
];

const PLATFORM_POSITIONS = [
  { name: "far-left", leftPercent: 22 },
  { name: "left", leftPercent: 38 },
  { name: "center", leftPercent: 50 },
  { name: "right", leftPercent: 62 },
  { name: "far-right", leftPercent: 78 }
] as const;

// deterministic hash (stable given the same inputs)
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function subscribeToReactionStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export default function CatStage() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isReflect = pathname === "/reflect";
  const [roll, setRoll] = useState(0);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  // Listen for reroll events (reflection step advances)
  useEffect(() => {
    const handleReroll = () => setRoll((r) => r + 1);
    const handlePreview = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string | null }>).detail;
      setPreviewMessage(detail?.message ?? null);
    };

    window.addEventListener("deskcat.cat.reroll", handleReroll);
    window.addEventListener("deskcat.cat.preview", handlePreview as EventListener);

    return () => {
      window.removeEventListener("deskcat.cat.reroll", handleReroll);
      window.removeEventListener("deskcat.cat.preview", handlePreview as EventListener);
    };
  }, []);

  const lastMessage = useSyncExternalStore(
    subscribeToReactionStore,
    () => (isReflect ? null : loadLastReaction()?.message ?? null),
    () => null
  );

  const message = isReflect ? previewMessage : lastMessage;

  const { slot, pose } = useMemo(() => {
    // Include pathname + roll so it changes every reroll AND differs by page
    const base = `${pathname}:${roll}`;

    const hPos = hashString(base + ":pos");
    const hPose = hashString(base + ":pose");

    return {
      slot: PLATFORM_POSITIONS[hPos % PLATFORM_POSITIONS.length],
      pose: POSES[hPose % POSES.length]
    };
  }, [pathname, roll]);

  if (isHome) return null;

  return (
    <div className="-mb-3 pointer-events-none select-none" aria-hidden="true">
      <div className="relative mx-auto h-[200px] w-[min(92vw,420px)]">
        {message && (
          <div
            className="absolute top-0"
            style={{
              left: `${slot.leftPercent}%`,
              transform: "translateX(-50%)"
            }}
          >
            <SpeechBubble
              text={message}
              tail={slot.leftPercent >= 50 ? "down-left" : "down-right"}
            />
          </div>
        )}

        <div
          className="absolute bottom-0"
          style={{
            left: `${slot.leftPercent}%`,
            transform: "translateX(-50%)"
          }}
        >
          <div className="relative h-[184px] w-[184px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)] opacity-95">
            <Image
              src={pose.src}
              alt="DeskCat"
              fill
              sizes="184px"
              placeholder="blur"
              priority
              className="object-contain"
              style={{
                transform: `translate(${pose.x}px, ${pose.y}px) scale(${pose.scale})`,
                transformOrigin: "50% 100%"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
