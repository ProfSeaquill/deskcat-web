"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CatStage from "../components/CatStage";
import SessionHistoryList from "../components/SessionHistoryList";
import { getOutcomeLabel } from "../lib/reflection";
import { loadSessions } from "../lib/storage";
import { useIsClient } from "../lib/useIsClient";

export default function StatsPage() {
  const isClient = useIsClient();
  const [refreshTick, setRefreshTick] = useState(0);
  const sessions = useMemo(() => {
    if (!isClient) return [];
    return refreshTick >= 0 ? loadSessions() : [];
  }, [isClient, refreshTick]);

  const totals = useMemo(() => {
    const total = sessions.length;
    const byOutcome: Record<string, number> = {};
    for (const s of sessions) {
      const key = s.outcome ?? "unknown";
      byOutcome[key] = (byOutcome[key] ?? 0) + 1;
    }
    return { total, byOutcome };
  }, [sessions]);

  return (
    <main className="min-h-screen px-6 pb-8 pt-10 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <CatStage />
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Stats</h1>
          <Link href="/" className="theme-link text-sm underline">
            ← Home
          </Link>
        </div>

        <div className="theme-surface rounded-2xl border p-4">
          <div className="theme-text-secondary text-sm">Total sessions saved</div>
          <div className="text-4xl font-semibold">{totals.total}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(totals.byOutcome).map(([k, v]) => (
              <span key={k} className="rounded-full border px-3 py-1 text-sm">
                {getOutcomeLabel(k)}: <span className="font-medium">{v}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="theme-surface rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Last 5 sessions</h2>
            <div className="flex items-center gap-2">
              {sessions.length > 5 && (
                <Link
                  href="/stats/sessions"
                  className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-xl border px-3 py-1 text-sm transition"
                >
                  View more
                </Link>
              )}

              <button
                className="theme-button-secondary theme-hover-highlight rounded-xl border px-3 py-1 text-sm transition"
                onClick={() => setRefreshTick((tick) => tick + 1)}
              >
                Refresh
              </button>
            </div>
          </div>

          <SessionHistoryList
            sessions={sessions}
            emptyMessage="No saved sessions yet."
            limit={5}
          />
        </div>
      </div>
    </main>
  );
}
