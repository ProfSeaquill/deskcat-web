"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DESKCAT_COSMETIC_OPTIONS,
  type DeskCatCosmeticId
} from "../../lib/deskcatSprite";
import type { DeskCatPoseId } from "../../lib/deskcatAnchors";

const POSE_OPTIONS: { id: "" | DeskCatPoseId; label: string }[] = [
  { id: "", label: "All poses" },
  { id: "logo", label: "Logo" },
  { id: "playing", label: "Playing" },
  { id: "reading", label: "Reading" },
  { id: "sleeping", label: "Sleeping" },
  { id: "sitting", label: "Sitting" },
  { id: "walking", label: "Walking" }
];

export default function AssetUploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cosmeticId, setCosmeticId] = useState<DeskCatCosmeticId>(
    DESKCAT_COSMETIC_OPTIONS[0].id
  );

  async function handleSubmit(formData: FormData) {
    setStatus("uploading");
    setMessage("");
    formData.set("cosmeticId", cosmeticId);

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
      setMessage("Asset uploaded.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={handleSubmit} className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <h2 className="theme-text-primary text-2xl font-semibold">Upload Asset</h2>
      <p className="theme-text-secondary mt-2 text-sm">
        Uploaded cosmetic assets are saved as public, accessible Blob files and recorded in the
        database for admin-managed cosmetics.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="theme-text-secondary block text-sm font-medium">
          Cosmetic
          <select
            value={cosmeticId}
            onChange={(event) => setCosmeticId(event.currentTarget.value as DeskCatCosmeticId)}
            className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
          >
            {DESKCAT_COSMETIC_OPTIONS.map((cosmetic) => (
              <option key={cosmetic.id} value={cosmetic.id}>
                {cosmetic.label}
              </option>
            ))}
          </select>
        </label>

        <label className="theme-text-secondary block text-sm font-medium">
          Purpose
          <select name="purpose" className="theme-input mt-2 w-full rounded-xl border px-3 py-2">
            <option value="render">Render</option>
            <option value="preview">Preview</option>
          </select>
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
          Access
          <select className="theme-input mt-2 w-full rounded-xl border px-3 py-2" disabled>
            <option>Public and accessible</option>
          </select>
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
          {status === "uploading" ? "Uploading..." : "Upload asset"}
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
