"use client";

import { useMemo, useState } from "react";
import CatStage from "../../components/CatStage";
import PageBackLink from "../../components/PageBackLink";
import SessionHistoryList from "../../components/SessionHistoryList";
import { loadSessions } from "../../lib/storage";
import { useIsClient } from "../../lib/useIsClient";

export default function SessionArchivePage() {
  const isClient = useIsClient();
  const [refreshTick, setRefreshTick] = useState(0);
  const sessions = useMemo(() => {
    if (!isClient) return [];
    return refreshTick >= 0 ? loadSessions() : [];
  }, [isClient, refreshTick]);

  return (
    <main className="min-h-screen px-6 pb-8 pt-10 flex justify-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <PageBackLink href="/stats" />
          <button
            type="button"
            className="theme-button-secondary theme-hover-highlight rounded-xl border px-3 py-1 text-sm transition"
            onClick={() => setRefreshTick((tick) => tick + 1)}
          >
            Refresh
          </button>
        </div>

        <CatStage />

        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">Session history</h1>
          <span className="theme-text-secondary text-sm">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="theme-surface rounded-2xl border p-4">
          <SessionHistoryList
            sessions={sessions}
            groupByDate
            emptyMessage="No saved sessions yet."
          />
        </div>
      </div>
    </main>
  );
}
