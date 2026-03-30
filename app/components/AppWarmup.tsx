"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import catPlaying from "@/art/Images/cat/playing.png";
import catReading from "@/art/Images/cat/reading.png";
import catSleeping from "@/art/Images/cat/sleeping.png";
import catStartled from "@/art/Images/cat/startled.png";
import catWalking from "@/art/Images/cat/walking.png";

const WARM_ROUTES = ["/timer", "/stats", "/reflect", "/my-deskcat"] as const;
const CAT_IMAGES = [catPlaying, catReading, catSleeping, catStartled, catWalking] as const;

export default function AppWarmup() {
  const router = useRouter();

  useEffect(() => {
    for (const route of WARM_ROUTES) {
      router.prefetch(route);
    }
  }, [router]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
    >
      {CAT_IMAGES.map((image, index) => (
        <Image
          key={image.src}
          src={image}
          alt=""
          width={184}
          height={184}
          sizes="184px"
          loading="eager"
          className="block"
          priority={index === 0}
        />
      ))}
    </div>
  );
}
