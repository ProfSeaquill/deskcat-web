"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import DeskCatSprite from "../../components/DeskCatSprite";
import {
  DESKCAT_ANCHOR_SLOT_IDS,
  DESKCAT_POSE_IDS,
  validateDeskCatAnchorDocument,
  type DeskCatAnchor,
  type DeskCatAnchorDocument,
  type DeskCatAnchorSlotId,
  type DeskCatPoseId,
  type DeskCatStageTransform
} from "../../lib/deskcatAnchors";
import type { DeskCatEquippedCosmetics } from "../../lib/deskcatSprite";

const SLOT_META: Record<DeskCatAnchorSlotId, { label: string; color: string }> = {
  eyes: { label: "Eyes", color: "#43d7ff" },
  head: { label: "Head", color: "#ff6b6b" },
  neck: { label: "Neck", color: "#ffd166" },
  tail: { label: "Tail", color: "#7ee081" }
};

const PREVIEW_COSMETICS: DeskCatEquippedCosmetics = {
  head: "red-top-hat",
  neck: "red-bowtie",
  glasses: "red-glasses",
  tail: "none"
};

function cloneDocument(document: DeskCatAnchorDocument): DeskCatAnchorDocument {
  return JSON.parse(JSON.stringify(document)) as DeskCatAnchorDocument;
}

function formatPoseLabel(poseId: DeskCatPoseId) {
  return poseId.charAt(0).toUpperCase() + poseId.slice(1);
}

export default function DeskCatAnchorEditor({
  initialDocument,
  requiresToken
}: {
  initialDocument: DeskCatAnchorDocument;
  requiresToken: boolean;
}) {
  const initialSnapshot = useRef(JSON.stringify(initialDocument));
  const canvasRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState(() => cloneDocument(initialDocument));
  const [poseId, setPoseId] = useState<DeskCatPoseId>("logo");
  const [slotId, setSlotId] = useState<DeskCatAnchorSlotId>("eyes");
  const [showCosmetics, setShowCosmetics] = useState(true);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const pose = document.poses[poseId];
  const anchor = pose.anchors[slotId];
  const isDirty = JSON.stringify(document) !== initialSnapshot.current;
  const validationErrors = useMemo(() => validateDeskCatAnchorDocument(document), [document]);

  function updateAnchor(changes: Partial<DeskCatAnchor>) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          anchors: {
            ...current.poses[poseId].anchors,
            [slotId]: { ...current.poses[poseId].anchors[slotId], ...changes }
          }
        }
      }
    }));
    setStatus("idle");
  }

  function updateStage(changes: Partial<DeskCatStageTransform>) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          stage: { ...current.poses[poseId].stage, ...changes }
        }
      }
    }));
    setStatus("idle");
  }

  function setAnchorFromPointer(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateAnchor({
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    setAnchorFromPointer(event.clientX, event.clientY);
  }

  function handleAnchorPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAnchorPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setAnchorFromPointer(event.clientX, event.clientY);
  }

  function handleAnchorKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 0.01 : 0.002;
    const movement = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step }
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    updateAnchor({
      x: Math.min(1, Math.max(0, anchor.x + movement.x)),
      y: Math.min(1, Math.max(0, anchor.y + movement.y))
    });
  }

  function resetPose() {
    const original = cloneDocument(initialDocument).poses[poseId];
    setDocument((current) => ({
      ...current,
      poses: { ...current.poses, [poseId]: original }
    }));
    setStatus("idle");
  }

  async function saveDocument() {
    if (validationErrors.length > 0) return;
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/dev/deskcat-anchors", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(document)
      });
      const result = (await response.json()) as { error?: string; errors?: string[] };
      if (!response.ok) throw new Error(result.errors?.join(" ") ?? result.error ?? "Save failed.");

      initialSnapshot.current = JSON.stringify(document);
      setStatus("saved");
      setMessage("Saved to app/data/deskcatAnchors.json");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[#10151c] px-4 py-5 text-[#edf2f7] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43d7ff]">Developer tools</p>
            <h1 className="mt-1 text-3xl font-semibold">DeskCat Anchor Editor</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#aeb9c6]">
              Place attachment points on each pose, preview the composite, and save the shared runtime data.
            </p>
          </div>
          <Link href="/" className="w-fit text-sm font-medium text-[#b9c4d0] underline underline-offset-4 hover:text-white">
            Return to DeskCat
          </Link>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[220px_minmax(420px,1fr)_300px]">
          <aside className="rounded-lg border border-white/10 bg-[#171d25] p-4">
            <h2 className="text-sm font-semibold">Pose</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1" role="list" aria-label="DeskCat poses">
              {DESKCAT_POSE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPoseId(id)}
                  aria-pressed={poseId === id}
                  className={`min-h-10 rounded-md border px-3 py-2 text-left text-sm transition ${
                    poseId === id
                      ? "border-[#43d7ff] bg-[#17303b] text-white"
                      : "border-white/10 bg-[#11161c] text-[#b9c4d0] hover:border-white/25"
                  }`}
                >
                  {formatPoseLabel(id)}
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-sm font-semibold">Anchor</h2>
            <div className="mt-3 space-y-2">
              {DESKCAT_ANCHOR_SLOT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSlotId(id)}
                  aria-pressed={slotId === id}
                  className={`flex min-h-10 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                    slotId === id ? "border-white/35 bg-[#252d37]" : "border-white/10 bg-[#11161c] hover:border-white/25"
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: SLOT_META[id].color }} />
                  {SLOT_META[id].label}
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-white/10 bg-[#171d25] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{formatPoseLabel(poseId)} preview</h2>
                <p className="mt-1 text-xs text-[#8f9cab]">Drag the selected marker or click the canvas to place it.</p>
              </div>
              <label className="flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
                <input
                  type="checkbox"
                  checked={showCosmetics}
                  onChange={(event) => setShowCosmetics(event.target.checked)}
                  className="h-4 w-4 accent-[#43d7ff]"
                />
                Preview cosmetics
              </label>
            </div>

            <div className="mx-auto mt-4 w-full max-w-[680px]">
              <div
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                className="relative aspect-square touch-none overflow-hidden rounded-md border border-white/15 bg-[linear-gradient(45deg,#202833_25%,transparent_25%),linear-gradient(-45deg,#202833_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#202833_75%),linear-gradient(-45deg,transparent_75%,#202833_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] bg-[#151a21]"
                aria-label={`${formatPoseLabel(poseId)} anchor canvas`}
              >
                <DeskCatSprite
                  poseId={poseId}
                  cosmetics={showCosmetics ? PREVIEW_COSMETICS : undefined}
                  alt={`${formatPoseLabel(poseId)} DeskCat pose`}
                  sizes="(max-width: 768px) 92vw, 680px"
                  layoutOverride={pose}
                  applyStageTransform={false}
                  overlay={
                    <div className="pointer-events-none absolute inset-0 z-20">
                      <div
                        className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-60"
                        style={{
                          left: `${anchor.x * 100}%`,
                          top: `${anchor.y * 100}%`,
                          width: `${anchor.width * 100}%`,
                          borderColor: SLOT_META[slotId].color
                        }}
                      />
                      {DESKCAT_ANCHOR_SLOT_IDS.map((id) => {
                        const item = pose.anchors[id];
                        const selected = id === slotId;
                        return (
                          <button
                            key={id}
                            type="button"
                            onPointerDown={handleAnchorPointerDown}
                            onPointerMove={selected ? handleAnchorPointerMove : undefined}
                            onKeyDown={selected ? handleAnchorKeyDown : undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSlotId(id);
                            }}
                            className={`pointer-events-auto absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold text-[#071016] shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 ${
                              selected ? "scale-110" : "opacity-75 hover:opacity-100"
                            }`}
                            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, backgroundColor: SLOT_META[id].color, borderColor: selected ? "white" : "#10151c" }}
                            aria-label={`${SLOT_META[id].label} anchor. Use arrow keys to move; hold Shift for larger steps.`}
                          >
                            {SLOT_META[id].label.slice(0, 1)}
                          </button>
                        );
                      })}
                    </div>
                  }
                />
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-white/10 bg-[#171d25] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: SLOT_META[slotId].color }}>
                  {SLOT_META[slotId].label}
                </p>
                <h2 className="mt-1 font-semibold">Anchor values</h2>
              </div>
              <span className="rounded bg-[#0f141a] px-2 py-1 font-mono text-xs text-[#9aa7b5]">{poseId}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="X" value={anchor.x} step={0.001} min={0} max={1} onChange={(x) => updateAnchor({ x })} />
              <NumberField label="Y" value={anchor.y} step={0.001} min={0} max={1} onChange={(y) => updateAnchor({ y })} />
              <NumberField label="Width" value={anchor.width} step={0.001} min={0.01} max={1} onChange={(width) => updateAnchor({ width })} />
              <NumberField label="Rotation" value={anchor.rotation} step={1} min={-360} max={360} suffix="deg" onChange={(rotation) => updateAnchor({ rotation })} />
              <NumberField label="Layer" value={anchor.zIndex} step={1} min={-10} max={10} onChange={(zIndex) => updateAnchor({ zIndex: Math.round(zIndex) })} />
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h2 className="text-sm font-semibold">Stage placement</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField label="Scale" value={pose.stage.scale} step={0.01} min={0.1} max={3} onChange={(scale) => updateStage({ scale })} />
                <NumberField label="X offset" value={pose.stage.x} step={1} onChange={(x) => updateStage({ x })} />
                <NumberField label="Y offset" value={pose.stage.y} step={1} onChange={(y) => updateStage({ y })} />
              </div>
            </div>

            {requiresToken && (
              <label className="mt-5 block text-xs font-medium text-[#aeb9c6]">
                Production editor token
                <input
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  autoComplete="off"
                  className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm text-white outline-none focus:border-[#43d7ff]"
                />
              </label>
            )}

            {validationErrors.length > 0 && (
              <div role="alert" className="mt-5 rounded-md border border-[#ff6b6b]/50 bg-[#3a1c20] p-3 text-xs text-[#ffd1d1]">
                {validationErrors[0]}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={resetPose} className="min-h-11 rounded-md border border-white/15 bg-[#10151c] px-3 text-sm font-medium hover:border-white/30">
                Reset pose
              </button>
              <button
                type="button"
                onClick={saveDocument}
                disabled={!isDirty || status === "saving" || validationErrors.length > 0}
                className="min-h-11 rounded-md border border-[#85edff] bg-[#baf7ff] px-3 text-sm font-semibold text-[#07131b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
              >
                {status === "saving" ? "Saving..." : "Save anchors"}
              </button>
            </div>

            <div aria-live="polite" className={`mt-3 min-h-5 text-xs ${status === "error" ? "text-[#ff9f9f]" : "text-[#8ee6a4]"}`}>
              {message || (isDirty ? "Unsaved changes" : "No unsaved changes")}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block min-w-0 text-xs font-medium text-[#aeb9c6]">
      {label}{suffix ? ` (${suffix})` : ""}
      <input
        type="number"
        value={Number(value.toFixed(4))}
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-[#0f141a] px-2 font-mono text-sm text-white outline-none focus:border-[#43d7ff]"
      />
    </label>
  );
}
