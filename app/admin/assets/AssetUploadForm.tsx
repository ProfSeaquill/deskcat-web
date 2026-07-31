"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DESKCAT_COSMETIC_CATEGORIES,
  type DeskCatCosmeticCategory
} from "../../lib/deskcatSprite";
import type { DeskCatAnchorSlotId, DeskCatPoseId } from "../../lib/deskcatAnchors";

const POSE_OPTIONS: { id: "" | DeskCatPoseId; label: string }[] = [
  { id: "", label: "All poses" },
  { id: "logo", label: "Logo" },
  { id: "playing", label: "Playing" },
  { id: "reading", label: "Reading" },
  { id: "sleeping", label: "Sleeping" },
  { id: "sitting", label: "Sitting" },
  { id: "walking", label: "Walking" }
];

const ANCHOR_SLOT_OPTIONS: { id: DeskCatAnchorSlotId; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "eyes", label: "Eyes" },
  { id: "tail", label: "Tail" }
];

function slugifyCosmeticName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AssetUploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cosmeticName, setCosmeticName] = useState("");
  const [cosmeticId, setCosmeticId] = useState("");
  const [category, setCategory] = useState<DeskCatCosmeticCategory>("head");
  const [anchorSlot, setAnchorSlot] = useState<DeskCatAnchorSlotId>("head");
  const [hasEditedCosmeticId, setHasEditedCosmeticId] = useState(false);

  useEffect(() => {
    if (!hasEditedCosmeticId) {
      setCosmeticId(slugifyCosmeticName(cosmeticName));
    }
  }, [cosmeticName, hasEditedCosmeticId]);

  async function handleSubmit(formData: FormData) {
    setStatus("uploading");
    setMessage("");
    formData.set("cosmeticName", cosmeticName);
    formData.set("cosmeticId", cosmeticId);
    formData.set("category", category);
    formData.set("anchorSlot", anchorSlot);

    try {
      const response = await fetch("/api/admin/assets", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Upload failed.");
      }

      setStatus("uploaded");
      setMessage("Cosmetic and asset uploaded.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={handleSubmit} className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <h2 className="theme-text-primary text-2xl font-semibold">Create Cosmetic</h2>
      <p className="theme-text-secondary mt-2 text-sm">
        Create a new draft cosmetic and upload its first private Blob asset.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="theme-text-secondary block text-sm font-medium">
          Cosmetic name
          <input
            name="cosmeticName"
            type="text"
            required
            value={cosmeticName}
            onChange={(event) => setCosmeticName(event.currentTarget.value)}
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          />
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Cosmetic ID
          <input
            name="cosmeticId"
            type="text"
            required
            value={cosmeticId}
            pattern="[a-z0-9][a-z0-9-]{0,79}"
            onChange={(event) => {
              setHasEditedCosmeticId(true);
              setCosmeticId(slugifyCosmeticName(event.currentTarget.value));
            }}
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          />
          <span className="theme-text-tertiary mt-2 block text-xs">
            Used internally. Lowercase letters, numbers, and dashes only.
          </span>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Category
          <select
            name="category"
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value as DeskCatCosmeticCategory)}
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          >
            {DESKCAT_COSMETIC_CATEGORIES.map((cosmeticCategory) => (
              <option key={cosmeticCategory.id} value={cosmeticCategory.id}>
                {cosmeticCategory.label}
              </option>
            ))}
          </select>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Anchor slot
          <select
            name="anchorSlot"
            value={anchorSlot}
            onChange={(event) => setAnchorSlot(event.currentTarget.value as DeskCatAnchorSlotId)}
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          >
            {ANCHOR_SLOT_OPTIONS.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>

        <label className="theme-text-secondary block text-sm font-medium md:col-span-2">
          Description
          <input
            name="description"
            type="text"
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          />
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Purpose
          <select name="purpose" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
            <option value="render">Render</option>
            <option value="preview">Preview</option>
          </select>
          <span className="theme-text-tertiary mt-2 block text-xs">
            Render assets are used on DeskCat. Preview assets are thumbnails for admin/catalog UI.
          </span>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          View
          <select name="assetView" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
            <option value="">Default</option>
            <option value="front">Front</option>
            <option value="threeQuarter">3/4</option>
          </select>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Pose
          <select name="poseId" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
            {POSE_OPTIONS.map((pose) => (
              <option key={pose.id || "all"} value={pose.id}>
                {pose.label}
              </option>
            ))}
          </select>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          App access
          <select name="accessible" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
            <option value="true">Accessible in app</option>
            <option value="false">Hidden from app</option>
          </select>
          <span className="theme-text-tertiary mt-2 block text-xs">
            This controls whether DeskCat should use the asset. Blob files are stored privately.
          </span>
        </label>
      </div>

      <label className="theme-text-secondary mt-4 block text-sm font-medium">
        PNG file
        <input
          name="file"
          type="file"
          accept="image/png"
          required
          className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "uploading"}
          className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-wait disabled:opacity-60"
        >
          {status === "uploading" ? "Uploading..." : "Create cosmetic"}
        </button>
        {message && (
          <span
            role={status === "error" ? "alert" : "status"}
            className={status === "error" ? "text-sm text-red-400" : "theme-text-secondary text-sm"}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
