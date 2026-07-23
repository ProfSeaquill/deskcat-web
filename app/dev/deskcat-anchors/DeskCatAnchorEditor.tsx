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
  type DeskCatAnchorAssetView,
  type DeskCatCutoutLayer,
  type DeskCatCutoutPoint,
  type DeskCatAnchorDocument,
  type DeskCatAnchorSlotId,
  type DeskCatPoseId,
  type DeskCatStageTransform
} from "../../lib/deskcatAnchors";
import {
  DEFAULT_DESKCAT_GLASSES_ID,
  DESKCAT_COSMETIC_CATEGORIES,
  NONE_DESKCAT_COSMETIC_ID,
  getDeskCatCosmetic,
  getDeskCatCosmeticsForCategory,
  type DeskCatCosmeticCategory,
  type DeskCatCosmeticId,
  type DeskCatCosmeticSelection,
  type DeskCatEquippedCosmetics
} from "../../lib/deskcatSprite";

const SLOT_META: Record<DeskCatAnchorSlotId, { label: string; color: string }> = {
  eyes: { label: "Eyes", color: "#43d7ff" },
  head: { label: "Head", color: "#ff6b6b" },
  neck: { label: "Neck", color: "#ffd166" },
  tail: { label: "Tail", color: "#7ee081" }
};

const PREVIEW_COSMETICS: DeskCatEquippedCosmetics = {
  head: "red-top-hat",
  neck: "red-bowtie",
  glasses: DEFAULT_DESKCAT_GLASSES_ID,
  tail: "none"
};

const NO_PREVIEW_COSMETICS: DeskCatEquippedCosmetics = {
  head: "none",
  neck: "none",
  glasses: "none",
  tail: "none"
};

const ASSET_VIEW_OPTIONS: { value: DeskCatAnchorAssetView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "threeQuarter", label: "3/4" }
];

type EditorTool = "anchors" | "lasso";

const MIN_PREVIEW_ZOOM = 0.5;
const MAX_PREVIEW_ZOOM = 3;
const PREVIEW_ZOOM_STEP = 0.25;

function cloneDocument(document: DeskCatAnchorDocument): DeskCatAnchorDocument {
  return JSON.parse(JSON.stringify(document)) as DeskCatAnchorDocument;
}

function createStableJsonSnapshot(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => createStableJsonSnapshot(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${createStableJsonSnapshot((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function formatPoseLabel(poseId: DeskCatPoseId) {
  return poseId.charAt(0).toUpperCase() + poseId.slice(1);
}

function mergeAnchorChanges(anchor: DeskCatAnchor, changes: Partial<DeskCatAnchor>): DeskCatAnchor {
  const nextChanges =
    changes.width !== undefined && changes.height === undefined && anchor.height === undefined
      ? { ...changes, height: anchor.width }
      : changes;
  return { ...anchor, ...nextChanges };
}

export default function DeskCatAnchorEditor({
  initialDocument,
  requiresToken
}: {
  initialDocument: DeskCatAnchorDocument;
  requiresToken: boolean;
}) {
  const initialSnapshot = useRef(createStableJsonSnapshot(initialDocument));
  const canvasRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState(() => cloneDocument(initialDocument));
  const [poseId, setPoseId] = useState<DeskCatPoseId>("logo");
  const [slotId, setSlotId] = useState<DeskCatAnchorSlotId>("eyes");
  const [tool, setTool] = useState<EditorTool>("anchors");
  const [lassoPoints, setLassoPoints] = useState<DeskCatCutoutPoint[]>([]);
  const [selectedCutoutId, setSelectedCutoutId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [showCosmetics, setShowCosmetics] = useState(true);
  const [showAnchorIndicators, setShowAnchorIndicators] = useState(true);
  const [previewCosmetics, setPreviewCosmetics] = useState<DeskCatEquippedCosmetics>(() => ({
    ...PREVIEW_COSMETICS
  }));
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const pose = document.poses[poseId];
  const slotCategory = DESKCAT_COSMETIC_CATEGORIES.find((category) => category.anchorSlot === slotId);
  const slotSelection = slotCategory ? previewCosmetics[slotCategory.id] : NONE_DESKCAT_COSMETIC_ID;
  const activeCosmeticId = slotSelection !== NONE_DESKCAT_COSMETIC_ID ? (slotSelection as DeskCatCosmeticId) : null;
  const activeCosmetic = activeCosmeticId ? getDeskCatCosmetic(activeCosmeticId) : null;
  const slotAnchor = pose.anchors[slotId];
  const anchor = activeCosmeticId ? pose.cosmeticAnchors?.[activeCosmeticId] ?? pose.anchors[slotId] : pose.anchors[slotId];
  const cutoutLayers = pose.cutoutLayers ?? [];
  const selectedCutout = cutoutLayers.find((layer) => layer.id === selectedCutoutId) ?? null;
  const isDirty = createStableJsonSnapshot(document) !== initialSnapshot.current;
  const validationErrors = useMemo(() => validateDeskCatAnchorDocument(document), [document]);

  function getAnchorForSlot(id: DeskCatAnchorSlotId) {
    const category = DESKCAT_COSMETIC_CATEGORIES.find((item) => item.anchorSlot === id);
    const selection = category ? previewCosmetics[category.id] : NONE_DESKCAT_COSMETIC_ID;
    return selection !== NONE_DESKCAT_COSMETIC_ID
      ? pose.cosmeticAnchors?.[selection] ?? pose.anchors[id]
      : pose.anchors[id];
  }

  function selectPose(id: DeskCatPoseId) {
    setPoseId(id);
    setLassoPoints([]);
    setSelectedCutoutId(null);
  }

  function updatePreviewZoom(value: number) {
    setPreviewZoom(Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, value)));
  }

  function updatePreviewCosmetic(
    category: DeskCatCosmeticCategory,
    selection: DeskCatCosmeticSelection
  ) {
    setPreviewCosmetics((current) => ({
      ...current,
      [category]: selection
    }));
  }

  function resetPreviewCosmetics() {
    setPreviewCosmetics({ ...PREVIEW_COSMETICS });
    setShowCosmetics(true);
  }

  function updateAnchor(changes: Partial<DeskCatAnchor>) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          anchors: activeCosmeticId
            ? current.poses[poseId].anchors
            : {
                ...current.poses[poseId].anchors,
                [slotId]: mergeAnchorChanges(current.poses[poseId].anchors[slotId], changes)
              },
          cosmeticAnchors: activeCosmeticId
            ? {
                ...(current.poses[poseId].cosmeticAnchors ?? {}),
                [activeCosmeticId]: mergeAnchorChanges(
                  current.poses[poseId].cosmeticAnchors?.[activeCosmeticId] ?? current.poses[poseId].anchors[slotId],
                  changes
                )
              }
            : current.poses[poseId].cosmeticAnchors
        }
      }
    }));
    setStatus("idle");
  }

  function updateSlotAnchor(changes: Partial<DeskCatAnchor>) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          anchors: {
            ...current.poses[poseId].anchors,
            [slotId]: mergeAnchorChanges(current.poses[poseId].anchors[slotId], changes)
          }
        }
      }
    }));
    setStatus("idle");
  }

  function updateCutoutLayer(layerId: string, changes: Partial<DeskCatCutoutLayer>) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          cutoutLayers: (current.poses[poseId].cutoutLayers ?? []).map((layer) =>
            layer.id === layerId ? { ...layer, ...changes } : layer
          )
        }
      }
    }));
    setStatus("idle");
  }

  function deleteCutoutLayer(layerId: string) {
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          cutoutLayers: (current.poses[poseId].cutoutLayers ?? []).filter((layer) => layer.id !== layerId)
        }
      }
    }));
    setSelectedCutoutId((current) => (current === layerId ? null : current));
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

  function getCanvasPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    };
  }

  function handleLassoPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    setLassoPoints((current) => [...current, point]);
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

  function clearLasso() {
    setLassoPoints([]);
  }

  function finishLasso() {
    if (lassoPoints.length < 3) return;
    const layerId = `${poseId}-cutout-${Date.now().toString(36)}`;
    const layer: DeskCatCutoutLayer = {
      id: layerId,
      label: `Cutout ${cutoutLayers.length + 1}`,
      points: lassoPoints,
      offsetX: 0,
      offsetY: 0,
      zIndex: 1,
      visible: true,
      flipX: false
    };
    setDocument((current) => ({
      ...current,
      poses: {
        ...current.poses,
        [poseId]: {
          ...current.poses[poseId],
          cutoutLayers: [...(current.poses[poseId].cutoutLayers ?? []), layer]
        }
      }
    }));
    setSelectedCutoutId(layerId);
    setLassoPoints([]);
    setStatus("idle");
  }

  async function publishDocument() {
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
      if (!response.ok) throw new Error(result.errors?.join(" ") ?? result.error ?? "Publish failed.");

      initialSnapshot.current = createStableJsonSnapshot(document);
      setStatus("saved");
      setMessage("Published to the app via app/data/deskcatAnchors.json");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Publish failed.");
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

        <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-white/10 bg-[#151b23] px-3 py-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f9cab]">Tools</span>
          <button
            type="button"
            onClick={() => setTool("anchors")}
            aria-pressed={tool === "anchors"}
            className={`min-h-8 rounded-md border px-3 text-sm ${
              tool === "anchors" ? "border-[#43d7ff] bg-[#17303b] text-white" : "border-white/10 bg-[#0f141a] text-[#b9c4d0] hover:border-white/25"
            }`}
          >
            Anchors
          </button>
          <button
            type="button"
            onClick={() => setTool("lasso")}
            aria-pressed={tool === "lasso"}
            className={`min-h-8 rounded-md border px-3 text-sm ${
              tool === "lasso" ? "border-[#ffd166] bg-[#332912] text-white" : "border-white/10 bg-[#0f141a] text-[#b9c4d0] hover:border-white/25"
            }`}
          >
            Lasso
          </button>
          <div className="h-6 w-px bg-white/10" />
          <button
            type="button"
            onClick={finishLasso}
            disabled={lassoPoints.length < 3}
            className="min-h-8 rounded-md border border-[#85edff] bg-[#baf7ff] px-3 text-sm font-semibold text-[#07131b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
          >
            Duplicate selection
          </button>
          <button
            type="button"
            onClick={clearLasso}
            disabled={lassoPoints.length === 0}
            className="min-h-8 rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm text-[#c8d1dc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear lasso
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex min-h-8 items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f9cab]">Zoom</span>
            <button
              type="button"
              onClick={() => updatePreviewZoom(previewZoom - PREVIEW_ZOOM_STEP)}
              disabled={previewZoom <= MIN_PREVIEW_ZOOM}
              className="h-8 w-8 rounded-md border border-white/15 bg-[#0f141a] text-sm text-[#c8d1dc] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out"
            >
              -
            </button>
            <input
              type="range"
              min={MIN_PREVIEW_ZOOM}
              max={MAX_PREVIEW_ZOOM}
              step={PREVIEW_ZOOM_STEP}
              value={previewZoom}
              onChange={(event) => updatePreviewZoom(event.currentTarget.valueAsNumber)}
              className="w-28 accent-[#43d7ff]"
              aria-label="Preview zoom"
            />
            <button
              type="button"
              onClick={() => updatePreviewZoom(previewZoom + PREVIEW_ZOOM_STEP)}
              disabled={previewZoom >= MAX_PREVIEW_ZOOM}
              className="h-8 w-8 rounded-md border border-white/15 bg-[#0f141a] text-sm text-[#c8d1dc] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => updatePreviewZoom(1)}
              className="min-h-8 rounded-md border border-white/15 bg-[#0f141a] px-2 font-mono text-xs text-[#c8d1dc]"
            >
              {Math.round(previewZoom * 100)}%
            </button>
          </div>
          <span className="ml-auto text-xs text-[#8f9cab]">{tool === "lasso" ? `${lassoPoints.length} points` : "Anchor editing"}</span>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[220px_minmax(420px,1fr)_300px]">
          <aside className="rounded-lg border border-white/10 bg-[#171d25] p-4">
            <h2 className="text-sm font-semibold">Pose</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1" role="list" aria-label="DeskCat poses">
              {DESKCAT_POSE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPose(id)}
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
                {tool === "lasso" && <p className="mt-1 text-xs text-[#ffd166]">Click around the source area, then duplicate the selection.</p>}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
                  <input
                    type="checkbox"
                    checked={showCosmetics}
                    onChange={(event) => setShowCosmetics(event.target.checked)}
                    className="h-4 w-4 accent-[#43d7ff]"
                  />
                  Preview cosmetics
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
                  <input
                    type="checkbox"
                    checked={showAnchorIndicators}
                    onChange={(event) => setShowAnchorIndicators(event.target.checked)}
                    className="h-4 w-4 accent-[#43d7ff]"
                  />
                  Show anchor indicators
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-white/10 bg-[#11161c] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Cosmetic test set</h3>
                <button
                  type="button"
                  onClick={resetPreviewCosmetics}
                  className="min-h-8 rounded-md border border-white/15 bg-[#0f141a] px-3 text-xs font-medium text-[#c8d1dc] hover:border-white/30"
                >
                  Reset test set
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {DESKCAT_COSMETIC_CATEGORIES.map((category) => (
                  <label key={category.id} className="block min-w-0 text-xs font-medium text-[#aeb9c6]">
                    {category.label}
                    <select
                      value={previewCosmetics[category.id]}
                      onChange={(event) =>
                        updatePreviewCosmetic(
                          category.id,
                          event.currentTarget.value as DeskCatCosmeticSelection
                        )
                      }
                      className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm text-white outline-none focus:border-[#43d7ff]"
                    >
                      <option value={NONE_DESKCAT_COSMETIC_ID}>None</option>
                      {getDeskCatCosmeticsForCategory(category.id).map((cosmetic) => (
                        <option key={cosmetic.id} value={cosmetic.id}>
                          {cosmetic.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-4 w-full max-w-[680px] overflow-auto rounded-md border border-white/10 bg-[#10151c] p-2">
              <div
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                className="relative mx-auto aspect-square touch-none overflow-hidden rounded-md border border-white/15 bg-[linear-gradient(45deg,#202833_25%,transparent_25%),linear-gradient(-45deg,#202833_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#202833_75%),linear-gradient(-45deg,transparent_75%,#202833_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] bg-[#151a21]"
                style={{ width: `${previewZoom * 100}%` }}
                aria-label={`${formatPoseLabel(poseId)} anchor canvas`}
              >
                <DeskCatSprite
                  poseId={poseId}
                  cosmetics={showCosmetics ? previewCosmetics : NO_PREVIEW_COSMETICS}
                  alt={`${formatPoseLabel(poseId)} DeskCat pose`}
                  sizes="(max-width: 768px) 92vw, 680px"
                  layoutOverride={pose}
                  applyStageTransform={false}
                  overlay={
                    <div className="pointer-events-none absolute inset-0 z-20">
                      {tool === "lasso" && (
                        <div
                          className="pointer-events-auto absolute inset-0 cursor-crosshair"
                          onPointerDown={handleLassoPointerDown}
                          aria-label="Lasso drawing surface"
                        />
                      )}
                      {(lassoPoints.length > 0 || cutoutLayers.length > 0) && (
                        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                          {cutoutLayers.map((layer) => (
                            <polygon
                              key={layer.id}
                              points={layer.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                              fill={layer.id === selectedCutoutId ? "rgba(255,209,102,0.18)" : "rgba(67,215,255,0.08)"}
                              stroke={layer.id === selectedCutoutId ? "#ffd166" : "#43d7ff"}
                              strokeWidth="0.35"
                            />
                          ))}
                          {lassoPoints.length > 0 && (
                            <polyline
                              points={lassoPoints.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                              fill="none"
                              stroke="#ffd166"
                              strokeDasharray="1 1"
                              strokeWidth="0.45"
                            />
                          )}
                        </svg>
                      )}
                      {showAnchorIndicators && (
                        <>
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 rounded border border-dashed opacity-60"
                            style={{
                              left: `${anchor.x * 100}%`,
                              top: `${anchor.y * 100}%`,
                              width: `${anchor.width * 100}%`,
                              height: `${(anchor.height ?? anchor.width) * 100}%`,
                              borderColor: slotAnchor.visible === false || anchor.visible === false ? "#8f9cab" : SLOT_META[slotId].color
                            }}
                          />
                          {DESKCAT_ANCHOR_SLOT_IDS.map((id) => {
                            const item = getAnchorForSlot(id);
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
                                  selected ? "scale-110" : pose.anchors[id].visible === false || item.visible === false ? "opacity-40" : "opacity-75 hover:opacity-100"
                                }`}
                                style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, backgroundColor: pose.anchors[id].visible === false || item.visible === false ? "#8f9cab" : SLOT_META[id].color, borderColor: selected ? "white" : "#10151c" }}
                                aria-label={`${SLOT_META[id].label} anchor. Use arrow keys to move; hold Shift for larger steps.`}
                              >
                                {SLOT_META[id].label.slice(0, 1)}
                              </button>
                            );
                          })}
                        </>
                      )}
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
                <p className="mt-1 text-xs text-[#8f9cab]">
                  Editing {activeCosmetic ? activeCosmetic.label : `${SLOT_META[slotId].label} fallback`}
                </p>
              </div>
              <span className="rounded bg-[#0f141a] px-2 py-1 font-mono text-xs text-[#9aa7b5]">{poseId}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="X" value={anchor.x} step={0.001} min={0} max={1} onChange={(x) => updateAnchor({ x })} />
              <NumberField label="Y" value={anchor.y} step={0.001} min={0} max={1} onChange={(y) => updateAnchor({ y })} />
              <NumberField label="Width" value={anchor.width} step={0.001} min={0.01} max={1} onChange={(width) => updateAnchor({ width })} />
              <NumberField label="Height" value={anchor.height ?? anchor.width} step={0.001} min={0.01} max={1} onChange={(height) => updateAnchor({ height })} />
              <NumberField label="Rotation" value={anchor.rotation} step={1} min={-360} max={360} suffix="deg" onChange={(rotation) => updateAnchor({ rotation })} />
              <NumberField label="Layer" value={anchor.zIndex} step={1} min={-10} max={10} onChange={(zIndex) => updateAnchor({ zIndex: Math.round(zIndex) })} />
            </div>

            <label className="mt-4 flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
              <input
                type="checkbox"
                checked={slotAnchor.visible !== false}
                onChange={(event) => updateSlotAnchor({ visible: event.currentTarget.checked })}
                className="h-4 w-4 accent-[#43d7ff]"
              />
              Enable this location on this pose
            </label>

            <label className="mt-4 block text-xs font-medium text-[#aeb9c6]">
              Asset view
              <select
                value={anchor.assetView ?? "front"}
                onChange={(event) => updateAnchor({ assetView: event.currentTarget.value as DeskCatAnchorAssetView })}
                className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-[#0f141a] px-3 text-sm text-white outline-none focus:border-[#43d7ff]"
              >
                {ASSET_VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
              <input
                type="checkbox"
                checked={anchor.flipX ?? false}
                onChange={(event) => updateAnchor({ flipX: event.currentTarget.checked })}
                className="h-4 w-4 accent-[#43d7ff]"
              />
              Flip asset horizontally
            </label>

            {activeCosmetic && (
              <label className="mt-3 flex min-h-10 items-center gap-2 text-sm text-[#c8d1dc]">
                <input
                  type="checkbox"
                  checked={anchor.visible !== false}
                  onChange={(event) => updateAnchor({ visible: event.currentTarget.checked })}
                  className="h-4 w-4 accent-[#43d7ff]"
                />
                Render this cosmetic on this pose
              </label>
            )}

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Cutout layers</h2>
                <span className="font-mono text-xs text-[#8f9cab]">{cutoutLayers.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {cutoutLayers.length === 0 && <p className="text-xs text-[#8f9cab]">Use the lasso tool to duplicate part of this pose.</p>}
                {cutoutLayers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedCutoutId(layer.id)}
                    aria-pressed={selectedCutoutId === layer.id}
                    className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${
                      selectedCutoutId === layer.id ? "border-[#ffd166] bg-[#302715] text-white" : "border-white/10 bg-[#11161c] text-[#b9c4d0] hover:border-white/25"
                    }`}
                  >
                    <span className="min-w-0 truncate">{layer.label}</span>
                    <span className="font-mono text-xs text-[#8f9cab]">z{layer.zIndex}</span>
                  </button>
                ))}
              </div>

              {selectedCutout && (
                <div className="mt-4 space-y-3 rounded-md border border-white/10 bg-[#11161c] p-3">
                  <label className="block text-xs font-medium text-[#aeb9c6]">
                    Label
                    <input
                      type="text"
                      value={selectedCutout.label}
                      onChange={(event) => updateCutoutLayer(selectedCutout.id, { label: event.currentTarget.value })}
                      className="mt-2 min-h-10 w-full rounded-md border border-white/15 bg-[#0f141a] px-2 text-sm text-white outline-none focus:border-[#43d7ff]"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="X offset" value={selectedCutout.offsetX} step={0.001} min={-1} max={1} onChange={(offsetX) => updateCutoutLayer(selectedCutout.id, { offsetX })} />
                    <NumberField label="Y offset" value={selectedCutout.offsetY} step={0.001} min={-1} max={1} onChange={(offsetY) => updateCutoutLayer(selectedCutout.id, { offsetY })} />
                    <NumberField label="Layer" value={selectedCutout.zIndex} step={1} min={-10} max={10} onChange={(zIndex) => updateCutoutLayer(selectedCutout.id, { zIndex: Math.round(zIndex) })} />
                  </div>
                  <label className="flex min-h-9 items-center gap-2 text-sm text-[#c8d1dc]">
                    <input
                      type="checkbox"
                      checked={selectedCutout.visible !== false}
                      onChange={(event) => updateCutoutLayer(selectedCutout.id, { visible: event.currentTarget.checked })}
                      className="h-4 w-4 accent-[#43d7ff]"
                    />
                    Visible
                  </label>
                  <label className="flex min-h-9 items-center gap-2 text-sm text-[#c8d1dc]">
                    <input
                      type="checkbox"
                      checked={selectedCutout.flipX ?? false}
                      onChange={(event) => updateCutoutLayer(selectedCutout.id, { flipX: event.currentTarget.checked })}
                      className="h-4 w-4 accent-[#43d7ff]"
                    />
                    Flip layer horizontally
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteCutoutLayer(selectedCutout.id)}
                    className="min-h-10 w-full rounded-md border border-[#ff6b6b]/45 bg-[#2a1418] px-3 text-sm font-medium text-[#ffc7c7] hover:border-[#ff8d8d]"
                  >
                    Delete cutout
                  </button>
                </div>
              )}
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
                onClick={publishDocument}
                disabled={!isDirty || status === "saving" || validationErrors.length > 0}
                className="min-h-11 rounded-md border border-[#85edff] bg-[#baf7ff] px-3 text-sm font-semibold text-[#07131b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35"
              >
                {status === "saving" ? "Publishing..." : "Publish to app"}
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
