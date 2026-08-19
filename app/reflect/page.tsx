"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CatStage from "../components/CatStage";
import PageBackLink from "../components/PageBackLink";
import { getCatReaction } from "../lib/cat";
import { deriveReflectionMetadata } from "../lib/reflection";
import {
  BUNDLED_REFLECTION_REVISION,
  REFLECTION_TREE,
  REFLECTION_TREE_VERSION,
  isRenderableReflectionTree,
  type ReflectionAnswer,
  type ReflectionTree
} from "../lib/reflectionTree";
import {
  computeStreaks,
  loadSessions,
  saveLastReaction,
  saveSession,
  type ReflectionPathEntry,
  type SessionLog
} from "../lib/storage";

type PublishedTree = { tree: ReflectionTree; revision: number };

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

function ReflectionBackButton({
  canGoBack,
  onBack
}: {
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="fixed left-4 top-4 z-40 max-w-[calc(100vw-2rem)]">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        ← Back
      </button>
    </div>
  );
}

function ReflectionFooter() {
  return (
    <div className="flex justify-end pt-1">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionType = searchParams.get("type") ?? "Sprint";

  // The bundled tree renders immediately, so there is no spinner between
  // finishing a session and being asked how it went. The published revision, if
  // there is one, is swapped in behind that.
  const [t, setTree] = useState<ReflectionTree>(REFLECTION_TREE);
  const [revision, setRevision] = useState<number>(BUNDLED_REFLECTION_REVISION);

  const [catMessage, setCatMessage] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string>(REFLECTION_TREE.start);
  const [path, setPath] = useState<ReflectionPathEntry[]>([]);

  const node = useMemo(() => t.nodes[nodeId], [t, nodeId]);
  const isTerminal = node?.kind === "terminal";

  // Swapping the tree out from under a half-finished reflection would change the
  // questions between one answer and the next, so once the reader has started,
  // a newer revision waits in `pendingTree` until the slate is clean again.
  const hasStarted = useRef(false);
  const pendingTree = useRef<PublishedTree | null>(null);

  const adoptTree = useCallback((next: PublishedTree) => {
    pendingTree.current = null;
    setTree(next.tree);
    setRevision(next.revision);
    setNodeId(next.tree.start);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/reflection/tree", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (!payload || typeof payload !== "object") return;

        const published = payload as { revision?: unknown; tree?: unknown };
        if (!isRenderableReflectionTree(published.tree)) return;

        const next: PublishedTree = {
          tree: published.tree,
          revision:
            typeof published.revision === "number" ? published.revision : BUNDLED_REFLECTION_REVISION
        };

        if (hasStarted.current) pendingTree.current = next;
        else adoptTree(next);
      })
      .catch(() => {
        // The bundled tree is already on screen and is a perfectly good answer.
      });

    return () => controller.abort();
  }, [adoptTree]);

  useEffect(() => {
    publishCatPreview(catMessage ?? node?.question ?? null);
  }, [catMessage, node]);

  useEffect(() => {
    return () => publishCatPreview(null);
  }, []);

  function restart() {
    setCatMessage(null);
    setPath([]);
    hasStarted.current = false;
    rerollCat();

    // A restart is the clean slate a newer revision was waiting for.
    if (pendingTree.current) {
      adoptTree(pendingTree.current);
      return;
    }

    setNodeId(t.start);
  }

  function goBack() {
    if (catMessage || path.length === 0) return;

    const previousStep = path[path.length - 1];
    setNodeId(previousStep.nodeId);
    setPath(path.slice(0, -1));
    rerollCat();
  }

  function choose(a: ReflectionAnswer) {
    if (catMessage) return;

    hasStarted.current = true;

    // The answer's tags travel with the step. They are what the session log is
    // derived from later, so they have to be captured against the tree as it
    // was when the reader answered.
    const nextPath = [
      ...path,
      {
        nodeId,
        answer: a.label,
        nextNodeId: a.next,
        outcome: a.outcome,
        area: a.area,
        recordAs: a.recordAs
      }
    ];
    setPath(nextPath);

    if (a.action === "save") {
      const metadata = deriveReflectionMetadata(nextPath);
      const entry: SessionLog = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        sessionType,
        outcome: metadata.outcome,
        focusArea: metadata.focusArea,
        nextFocus: metadata.nextFocus,
        treeVersion: t.version ?? REFLECTION_TREE_VERSION,
        treeRevision: revision,
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

    if (a.action === "discard") {
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
        <ReflectionBackButton canGoBack={path.length > 0} onBack={goBack} />
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
          <ReflectionFooter />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <ReflectionBackButton canGoBack={path.length > 0 && !catMessage} onBack={goBack} />
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
                {a.description && (
                  <span className="theme-text-secondary mt-1 block text-sm">{a.description}</span>
                )}
              </button>
            ))}
          </div>

          {isTerminal && !catMessage && (
            <p className="theme-text-secondary text-sm">Click Save to log this session.</p>
          )}
        </div>

        <ReflectionFooter />
      </div>
    </main>
  );
}

function ReflectPageFallback() {
  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <div className="fixed left-4 top-4 z-40 max-w-[calc(100vw-2rem)]">
        <PageBackLink href="/" />
      </div>

      <div className="w-full max-w-md space-y-3">
        <CatStage />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Reflection</h1>
          <span className="theme-text-secondary text-2xl font-semibold">Loading</span>
        </div>

        <div className="theme-surface rounded-2xl border p-5">
          <p className="theme-text-secondary">Preparing reflection...</p>
        </div>

        <ReflectionFooter />
      </div>
    </main>
  );
}
