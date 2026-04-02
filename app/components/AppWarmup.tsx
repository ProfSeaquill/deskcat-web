"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DESKCAT_POSES } from "../lib/deskcatSprite";

const WARM_ROUTES = ["/timer", "/stats", "/reflect", "/my-deskcat"] as const;

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
      {DESKCAT_POSES.map((pose, index) => (
        <Image
          key={pose.id}
          src={pose.src}
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
