"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProgressionMeter from "./ProgressionMeter";
import DeskCatSprite from "./DeskCatSprite";
import {
  DEFAULT_DONATION_PROGRESS,
  type DonationProgressSnapshot
} from "../lib/donations";
import { loadSessions, computeStreaks } from "../lib/storage";
import { useIsClient } from "../lib/useIsClient";
import SpeechBubble from "./SpeechBubble";
import AccountControl from "./AccountControl";
import { getCatGreeting } from "../lib/cat";
import { APPEARANCE_EVENT, loadAppearanceSettings } from "../lib/appearance";
import { DEFAULT_DESKCAT_COSMETICS } from "../lib/deskcatSprite";
import { useAppearanceCatalog } from "./AppearanceCatalogProvider";

function subscribeToAppearanceStore(onStoreChange: () => void) {
  window.addEventListener(APPEARANCE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(APPEARANCE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

type HomeAppProps = {
  showDonationMeter?: boolean;
};

export default function HomeApp({ showDonationMeter = true }: HomeAppProps) {
  const { catalog } = useAppearanceCatalog();
  const router = useRouter();
  const isClient = useIsClient();
  const [sessionType, setSessionType] = useState("Sprint");
  const [donationProgress, setDonationProgress] =
    useState<DonationProgressSnapshot>(DEFAULT_DONATION_PROGRESS);
  const greeting = useMemo(() => (isClient ? getCatGreeting() : null), [isClient]);
  const streak = computeStreaks(isClient ? loadSessions() : []);
  const cosmetics = useSyncExternalStore(
    subscribeToAppearanceStore,
    () => loadAppearanceSettings(catalog).cosmetics,
    () => DEFAULT_DESKCAT_COSMETICS
  );

  const refreshDonationProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/donations/progress", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as DonationProgressSnapshot;
      setDonationProgress(data);
    } catch {
      // Keep the current snapshot when the API is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!showDonationMeter) return;

    let isCancelled = false;

    async function loadInitialDonationProgress() {
      try {
        const response = await fetch("/api/donations/progress", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as DonationProgressSnapshot;
        if (!isCancelled) {
          setDonationProgress(data);
        }
      } catch {
        // Keep the local fallback snapshot when the API is unavailable.
      }
    }

    void loadInitialDonationProgress();

    return () => {
      isCancelled = true;
    };
  }, [showDonationMeter]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div
        className={`mx-auto grid w-full gap-8 lg:items-start ${
          showDonationMeter ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_316px]" : "max-w-3xl"
        }`}
      >
        <section className="space-y-4">
          <div className="theme-surface relative overflow-visible rounded-[32px] border px-5 pb-4 pt-16 backdrop-blur sm:pt-4">
            <div className="absolute right-4 top-4">
              <AccountControl />
            </div>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center">
              <div className="relative shrink-0">
                {greeting && (
                  <div className="absolute bottom-[250px] left-[64%] z-10 -translate-x-1/2">
                    <SpeechBubble text={greeting} tail="down-left" />
                  </div>
                )}

                <Link
                  href="/my-deskcat"
                  aria-label="My DeskCat"
                  className="group shrink-0 rounded-[28px] p-1 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  <div className="relative h-[232px] w-[232px] shrink-0 self-center">
                    <div className="absolute left-1/2 top-1/2 h-[296px] w-[296px] -translate-x-1/2 -translate-y-1/2 transition-transform group-hover:scale-[1.01]">
                      <DeskCatSprite
                        poseId="logo"
                        cosmetics={cosmetics}
                        alt="DeskCat"
                        priority
                        sizes="348px"
                      />
                    </div>
                  </div>
                </Link>
              </div>

              <div className="max-w-sm text-center">
                <h1
                  className="theme-text-primary text-[2.7rem] font-semibold leading-none tracking-tight"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  DeskCat
                </h1>

                <p className="theme-text-secondary mt-2 text-[1.05rem]">
                  The world&apos;s coziest writing companion.
                </p>

                <Link
                  href="/my-deskcat"
                  className="theme-link mt-3 inline-flex text-[1.1rem] font-medium underline decoration-sky-300 underline-offset-4"
                >
                  My DeskCat
                </Link>
              </div>
            </div>
          </div>

          <div className="theme-surface rounded-[28px] border p-5 backdrop-blur">
            <div className="space-y-3">
              <label className="theme-text-secondary block text-sm font-medium">Session type</label>
              <select
                className="theme-input w-full rounded-xl border px-3 py-2"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
              >
                <option value="Sprint">Sprint -- 15 mins, no breaks, 1 round</option>
                <option value="Marathon">Marathon -- 60 mins, no breaks, 1 round</option>
                <option value="Pomodoro">Pomodoro -- 15 mins, 5 min breaks, 3 rounds</option>
                <option value="Custom">Custom</option>
              </select>

              <button
                className="theme-hover-highlight w-full rounded-xl border border-[#d8fbff] bg-[#baf7ff] py-3 font-semibold text-[#07131b] shadow-[0_0_30px_rgba(186,247,255,0.28)] transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#baf7ff]/70"
                onClick={() => router.push(`/timer?type=${encodeURIComponent(sessionType)}`)}
              >
                Start Session
              </button>
            </div>
          </div>

          <div className="theme-surface rounded-[28px] border p-5 backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="theme-text-tertiary text-xs uppercase tracking-[0.2em]">
                    Current streak
                  </div>
                  <div className="theme-text-primary mt-2 text-3xl font-semibold">
                    {streak.currentStreak}
                  </div>
                </div>
                <div>
                  <div className="theme-text-tertiary text-xs uppercase tracking-[0.2em]">
                    Best streak
                  </div>
                  <div className="theme-text-primary mt-2 text-3xl font-semibold">
                    {streak.bestStreak}
                  </div>
                </div>
                <div>
                  <div className="theme-text-tertiary text-xs uppercase tracking-[0.2em]">
                    Last 7 days
                  </div>
                  <div className="theme-text-primary mt-2 text-3xl font-semibold">
                    {streak.sessionsLast7}
                  </div>
                </div>
              </div>

              <Link
                href="/stats"
                className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                View Stats →
              </Link>
            </div>
          </div>

          <div className="px-1">
            <p className="theme-text-tertiary text-xs">v1 2026</p>
          </div>
        </section>

        {showDonationMeter && (
          <aside className="self-start">
            <ProgressionMeter
              title={donationProgress.title}
              actionLabel={donationProgress.actionLabel}
              currentAmount={donationProgress.currentAmount}
              goalAmount={donationProgress.goalAmount}
              currencyCode={donationProgress.currencyCode}
              rewards={donationProgress.rewards}
              onDonationConfirmed={refreshDonationProgress}
            />
          </aside>
        )}
      </div>
    </main>
  );
}
