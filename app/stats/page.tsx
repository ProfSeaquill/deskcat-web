"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CatStage from "../components/CatStage";
import { getAreaLabel, getOutcomeLabel } from "../lib/reflection";
import { loadSessions } from "../lib/storage";
import { useIsClient } from "../lib/useIsClient";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

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
            <h2 className="text-lg font-semibold">Recent sessions</h2>
            <button
              className="theme-button-secondary theme-hover-highlight rounded-xl border px-3 py-1 text-sm transition"
              onClick={() => setRefreshTick((tick) => tick + 1)}
            >
              Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="theme-text-secondary mt-3">No saved sessions yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sessions.slice(0, 10).map((s) => (
                <li key={s.id} className="theme-subsurface rounded-xl border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {s.sessionType} • {getOutcomeLabel(s.outcome)}
                    </div>
                    <div className="theme-text-secondary text-sm">{formatDate(s.createdAt)}</div>
                  </div>

                  {getAreaLabel(s.focusArea) && (
                    <div className="theme-text-secondary mt-1 text-sm">
                      Focus area: <span className="font-medium">{getAreaLabel(s.focusArea)}</span>
                    </div>
                  )}

                  <div className="theme-text-secondary mt-1 text-sm">
                    Next focus: <span className="font-medium">{s.nextFocus ?? "—"}</span>
                  </div>

                  <details className="mt-2">
                    <summary className="theme-text-secondary cursor-pointer text-sm">
                      Show reflection path
                    </summary>
                    <ol className="theme-text-secondary mt-2 list-decimal space-y-1 pl-5 text-sm">
                      {s.reflectionPath.map((p, i) => (
                        <li key={i}>
                          <span className="font-medium">{p.nodeId}</span>: {p.answer}
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
