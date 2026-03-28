"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CatStage from "../components/CatStage";
import tree from "../data/reflectionTree.json";
import { getCatReaction } from "../lib/cat";
import { deriveReflectionMetadata, getAreaDescriptionForLabel } from "../lib/reflection";
import {
  computeStreaks,
  loadSessions,
  saveLastReaction,
  saveSession,
  type ReflectionPathEntry,
  type SessionLog
} from "../lib/storage";

type Answer = { label: string; next: string | null };
type Node = { id: string; question: string; answers: Answer[] };

type Tree = {
  start: string;
  nodes: Record<string, Node>;
};

function publishCatPreview(message: string | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("deskcat.cat.preview", {
      detail: { message }
    })
  );
}

function rerollCat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("deskcat.cat.reroll"));
}

function ReflectionFooter({
  canGoBack,
  onBack
}: {
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        ← Back
      </button>

      <Link
        href="/"
        className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        Home
      </Link>
    </div>
  );
}

export default function ReflectPage() {
  return (
    <Suspense fallback={<ReflectPageFallback />}>
      <ReflectPageContent />
    </Suspense>
  );
}

function ReflectPageContent() {
  const t = tree as unknown as Tree;

  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionType = searchParams.get("type") ?? "Sprint";

  const [catMessage, setCatMessage] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string>(t.start);
  const [path, setPath] = useState<ReflectionPathEntry[]>([]);

  const node = useMemo(() => t.nodes[nodeId], [t, nodeId]);
  const isEnd = nodeId === "end";

  useEffect(() => {
    publishCatPreview(catMessage ?? node?.question ?? null);
  }, [catMessage, node]);

  useEffect(() => {
    return () => publishCatPreview(null);
  }, []);

  function restart() {
    setCatMessage(null);
    setNodeId(t.start);
    setPath([]);
    rerollCat();
  }

  function goBack() {
    if (catMessage || path.length === 0) return;

    const previousStep = path[path.length - 1];
    setNodeId(previousStep.nodeId);
    setPath(path.slice(0, -1));
    rerollCat();
  }

  function choose(a: Answer) {
    if (catMessage) return;

    const nextPath = [...path, { nodeId, answer: a.label, nextNodeId: a.next }];
    setPath(nextPath);

    if (isEnd) {
      if (a.label === "Save") {
        const metadata = deriveReflectionMetadata(nextPath);
        const entry: SessionLog = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          sessionType,
          outcome: metadata.outcome,
          focusArea: metadata.focusArea,
          nextFocus: metadata.nextFocus,
          reflectionPath: nextPath
        };

        saveSession(entry);

        const sessionsNow = loadSessions();
        const streak = computeStreaks(sessionsNow);

        const msg = getCatReaction(entry.outcome ?? "unknown", streak.currentStreak);
        setCatMessage(msg);
        publishCatPreview(msg);

        saveLastReaction({
          createdAt: new Date().toISOString(),
          message: msg,
          outcome: entry.outcome,
          sessionType: entry.sessionType
        });

        setTimeout(() => router.push("/"), 1200);
        return;
      }

      router.push("/");
      return;
    }

    if (a.next) {
      rerollCat();
      setNodeId(a.next);
    }
  }

  if (!node) {
    return (
      <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
        <div className="w-full max-w-md space-y-3">
          <CatStage />
          <h1 className="text-2xl font-semibold">Reflection</h1>
          <p className="theme-text-secondary">
            Couldn’t find node <code>{nodeId}</code> in the reflection tree.
          </p>
          <button
            className="theme-button-secondary theme-hover-highlight rounded-xl border px-4 py-2 transition"
            onClick={restart}
          >
            Restart
          </button>
          <ReflectionFooter canGoBack={path.length > 0} onBack={goBack} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <div className="w-full max-w-md space-y-3">
        <CatStage />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Reflection</h1>
          <button className="theme-link text-2xl font-semibold underline" onClick={restart}>
            Restart
          </button>
        </div>

        <div className="theme-surface rounded-2xl border p-5 space-y-4">
          <div className="space-y-2">
            {node.answers.map((a, index) => (
              <button
                key={`${node.id}:${index}:${a.label}`}
                className="theme-subsurface theme-hover-highlight theme-text-primary w-full rounded-xl border px-4 py-3 text-left transition active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/35"
                onClick={() => choose(a)}
              >
                <span className="block font-medium">{a.label}</span>
                {getAreaDescriptionForLabel(a.label) && (
                  <span className="theme-text-secondary mt-1 block text-sm">
                    {getAreaDescriptionForLabel(a.label)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isEnd && !catMessage && (
            <p className="theme-text-secondary text-sm">Click Save to log this session.</p>
          )}
        </div>

        <ReflectionFooter canGoBack={path.length > 0 && !catMessage} onBack={goBack} />
      </div>
    </main>
  );
}

function ReflectPageFallback() {
  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <div className="w-full max-w-md space-y-3">
        <CatStage />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Reflection</h1>
          <span className="theme-text-secondary text-2xl font-semibold">Loading</span>
        </div>

        <div className="theme-surface rounded-2xl border p-5">
          <p className="theme-text-secondary">Preparing reflection...</p>
        </div>

        <ReflectionFooter canGoBack={false} onBack={() => {}} />
      </div>
    </main>
  );
}
