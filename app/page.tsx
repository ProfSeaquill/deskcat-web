"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import deskcatLogo from "@/art/Images/deskcat-logo.png";
import ProgressionMeter from "./components/ProgressionMeter";
import { loadSessions, computeStreaks, loadLastReaction } from "./lib/storage";
import { useIsClient } from "./lib/useIsClient";
import SpeechBubble from "./components/SpeechBubble";

const rewardMilestones = [
  { label: "Reward 1", value: 33 },
  { label: "Reward 2", value: 66 },
  { label: "Reward 3", value: 100, highlight: true }
];

export default function Home() {
  const router = useRouter();
  const isClient = useIsClient();
  const [sessionType, setSessionType] = useState("Sprint");
  const lastReaction = isClient ? loadLastReaction() : null;
  const streak = computeStreaks(isClient ? loadSessions() : []);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_316px] lg:items-start">
        <section className="space-y-4">
          <div className="theme-surface rounded-[32px] border px-5 py-4 backdrop-blur">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              <Link
                href="/my-deskcat"
                aria-label="My DeskCat"
                className="group shrink-0 rounded-[28px] p-1 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <Image
                  src={deskcatLogo}
                  alt="DeskCat"
                  width={232}
                  height={232}
                  className="shrink-0 self-center transition-transform group-hover:scale-[1.01]"
                />
              </Link>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="theme-text-primary text-4xl font-semibold tracking-tight">
                  DeskCat
                </h1>

                <p className="theme-text-secondary mt-2 text-[1.05rem]">
                  The world&apos;s coziest writing companion.
                </p>

                <Link
                  href="/my-deskcat"
                  className="theme-link mt-3 inline-flex text-sm font-medium underline decoration-sky-300 underline-offset-4"
                >
                  My DeskCat
                </Link>

                {lastReaction && (
                  <div className="mt-4">
                    <SpeechBubble text={lastReaction.message} tail="up-left" />
                  </div>
                )}
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
            <p className="theme-text-tertiary text-xs">v0 — local-only MVP</p>
          </div>
        </section>

        <aside className="self-start">
          <ProgressionMeter
            title="Buy DeskCat food"
            actionLabel="Donate"
            currentPercent={62}
            rewards={rewardMilestones}
          />
        </aside>
      </div>
    </main>
  );
}
