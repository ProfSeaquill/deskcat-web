"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  DESKCAT_COSMETIC_CATEGORIES,
  type DeskCatCosmeticCategory
} from "../../lib/deskcatSprite";
import type { DeskCatAnchorSlotId, DeskCatPoseId } from "../../lib/deskcatAnchors";
import { ASSET_VIEW_LABELS, parseAssetFileName } from "../../lib/cosmeticAssetVariants";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_BATCH_SIZE = 20;

const ANCHOR_SLOT_OPTIONS: { id: DeskCatAnchorSlotId; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "eyes", label: "Eyes" },
  { id: "tail", label: "Tail" }
];

const POSE_OPTIONS: { id: "" | DeskCatPoseId; label: string }[] = [
  { id: "", label: "All poses" },
  { id: "logo", label: "Logo" },
  { id: "playing", label: "Playing" },
  { id: "reading", label: "Reading" },
  { id: "sleeping", label: "Sleeping" },
  { id: "sitting", label: "Sitting" },
  { id: "walking", label: "Walking" }
];

type UploadStatus = "ready" | "uploading" | "saved" | "error";

type BatchUploadRow = {
  rowId: string;
  file: File;
  cosmeticName: string;
  cosmeticId: string;
  category: DeskCatCosmeticCategory;
  anchorSlot: DeskCatAnchorSlotId;
  purpose: "preview" | "render";
  assetView: "" | "front" | "threeQuarter";
  poseId: "" | DeskCatPoseId;
  accessible: "true" | "false";
  status: UploadStatus;
  message: string;
};

function slugifyCosmeticName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function anchorForCategory(category: DeskCatCosmeticCategory): DeskCatAnchorSlotId {
  switch (category) {
    case "glasses":
      return "eyes";
    case "neck":
      return "neck";
    case "tail":
      return "tail";
    case "head":
      return "head";
  }
}

function formatFileSize(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function statusLabel(row: BatchUploadRow) {
  switch (row.status) {
    case "uploading":
      return "Uploading";
    case "saved":
      return "Saved";
    case "error":
      return row.message || "Failed";
    default:
      return "Ready";
  }
}

export default function BatchAssetUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BatchUploadRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  function updateRow(rowId: string, update: Partial<BatchUploadRow>) {
    setRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...update } : row))
    );
  }

  // Rows sharing a cosmetic ID are variants of one cosmetic, and the upload API
  // rejects a batch whose variants disagree on the cosmetic-level fields, so
  // edits to those fields carry across the whole group.
  function updateCosmeticGroup(rowId: string, update: Partial<BatchUploadRow>) {
    setRows((current) => {
      const target = current.find((row) => row.rowId === rowId);
      if (!target) return current;

      return current.map((row) => {
        if (row.rowId === rowId) return { ...row, ...update };
        if (row.cosmeticId !== target.cosmeticId || row.status === "saved") return row;
        return { ...row, ...update, status: "ready", message: "" };
      });
    });
  }

  function handleFiles(files: FileList | null) {
    setMessage("");
    setMessageIsError(false);

    if (!files || files.length === 0) {
      setRows([]);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, MAX_BATCH_SIZE);
    // Front and 3/4 files of the same cosmetic share one ID on purpose, so the
    // duplicate counter keys on the view too and only bumps genuine clashes.
    const variantCounts = new Map<string, number>();
    const nextRows = selectedFiles.map((file, index): BatchUploadRow => {
      const parsed = parseAssetFileName(file.name);
      const cosmeticName = parsed.baseName || `Cosmetic ${index + 1}`;
      const baseSlug = slugifyCosmeticName(cosmeticName) || `cosmetic-${index + 1}`;
      const variantKey = `${baseSlug}:${parsed.assetView}`;
      const count = (variantCounts.get(variantKey) ?? 0) + 1;
      variantCounts.set(variantKey, count);
      const suffix = count > 1 ? `-${count}` : "";
      const cosmeticId = `${baseSlug.slice(0, 80 - suffix.length)}${suffix}`;
      const isValidPng = file.type === "image/png" && file.size > 0 && file.size <= MAX_UPLOAD_BYTES;

      return {
        rowId: `${file.name}:${file.size}:${file.lastModified}:${index}`,
        file,
        cosmeticName,
        cosmeticId,
        category: "head",
        anchorSlot: "head",
        purpose: "render",
        assetView: parsed.assetView,
        poseId: "",
        accessible: "true",
        status: isValidPng ? "ready" : "error",
        message: isValidPng ? "" : "Use a PNG file no larger than 4 MB."
      };
    });

    // Keep variants of one cosmetic adjacent so the grouping is obvious.
    nextRows.sort(
      (left, right) =>
        left.cosmeticId.localeCompare(right.cosmeticId) ||
        left.assetView.localeCompare(right.assetView)
    );

    setRows(nextRows);

    if (files.length > MAX_BATCH_SIZE) {
      setMessage(`Only the first ${MAX_BATCH_SIZE} files were added.`);
      setMessageIsError(true);
    }
  }

  function clearRows() {
    setRows([]);
    setMessage("");
    setMessageIsError(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveAll() {
    const invalidRow = rows.find(
      (row) =>
        row.status !== "saved" &&
        (!row.cosmeticName.trim() || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.cosmeticId))
    );

    if (invalidRow) {
      setMessage("Every row needs a name and a valid lowercase cosmetic ID.");
      setMessageIsError(true);
      return;
    }

    const pendingRows = rows.filter((row) => row.status !== "saved");
    if (pendingRows.length === 0) return;

    setIsSaving(true);
    setMessage("");
    setMessageIsError(false);
    let savedCount = 0;
    let failedCount = 0;

    for (const row of pendingRows) {
      if (row.file.type !== "image/png" || row.file.size <= 0 || row.file.size > MAX_UPLOAD_BYTES) {
        updateRow(row.rowId, { status: "error", message: "Use a PNG file no larger than 4 MB." });
        failedCount += 1;
        continue;
      }

      updateRow(row.rowId, { status: "uploading", message: "" });

      const formData = new FormData();
      formData.set("file", row.file);
      formData.set("cosmeticName", row.cosmeticName.trim());
      formData.set("cosmeticId", row.cosmeticId);
      formData.set("description", "");
      formData.set("category", row.category);
      formData.set("anchorSlot", row.anchorSlot);
      formData.set("purpose", row.purpose);
      formData.set("assetView", row.assetView);
      formData.set("poseId", row.poseId);
      formData.set("accessible", row.accessible);

      try {
        const response = await fetch("/api/admin/assets", {
          method: "POST",
          body: formData
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error ?? "Upload failed.");
        }

        updateRow(row.rowId, { status: "saved", message: "" });
        savedCount += 1;
      } catch (error) {
        updateRow(row.rowId, {
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed."
        });
        failedCount += 1;
      }
    }

    setIsSaving(false);
    if (savedCount > 0) router.refresh();

    if (failedCount > 0) {
      setMessage(`${savedCount} saved, ${failedCount} failed. Fix the failed rows and save again.`);
      setMessageIsError(true);
    } else {
      setMessage(`${savedCount} asset${savedCount === 1 ? "" : "s"} saved.`);
      setMessageIsError(false);
    }
  }

  const variantCountByCosmeticId = rows.reduce((counts, row) => {
    counts.set(row.cosmeticId, (counts.get(row.cosmeticId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return (
    <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <h2 className="theme-text-primary text-2xl font-semibold">Batch Upload</h2>
      <p className="theme-text-secondary mt-2 text-sm">
        Select up to {MAX_BATCH_SIZE} PNGs. Each file becomes a row so you can set every asset spec,
        then save the whole batch with one click. Filenames ending in a view suffix (
        <code>_front</code>, <code>_3:4</code>, <code>_three-quarter</code>) are read as variants of
        one cosmetic: <code>red_bowtie_front.png</code> and <code>red_bowtie_3:4.png</code> both land
        on <code>red-bowtie</code>. Rows sharing a cosmetic ID keep their name, category, and anchor
        in sync.
      </p>

      <label className="theme-text-secondary mt-5 block text-sm font-medium">
        PNG files
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          multiple
          disabled={isSaving}
          onChange={(event) => handleFiles(event.currentTarget.files)}
          className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1380px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="theme-text-tertiary">
                <tr>
                  <th className="px-3 py-2 font-semibold">File</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Anchor</th>
                  <th className="px-3 py-2 font-semibold">Purpose</th>
                  <th className="px-3 py-2 font-semibold">View</th>
                  <th className="px-3 py-2 font-semibold">Pose</th>
                  <th className="px-3 py-2 font-semibold">App access</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isLocked = isSaving || row.status === "saved";
                  return (
                    <tr key={row.rowId} className="theme-subsurface">
                      <td className="rounded-l-2xl border-y border-l px-3 py-3">
                        <div className="theme-text-primary max-w-[180px] truncate font-semibold">
                          {row.file.name}
                        </div>
                        <div className="theme-text-tertiary mt-1 text-xs">
                          {formatFileSize(row.file.size)}
                          {row.assetView ? ` · ${ASSET_VIEW_LABELS[row.assetView]} detected` : ""}
                        </div>
                      </td>
                      <td className="border-y px-2 py-3">
                        <input
                          type="text"
                          value={row.cosmeticName}
                          disabled={isLocked}
                          aria-label={`Name for ${row.file.name}`}
                          onChange={(event) =>
                            updateCosmeticGroup(row.rowId, {
                              cosmeticName: event.currentTarget.value,
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[170px] rounded-xl border px-3 py-2"
                        />
                      </td>
                      <td className="border-y px-2 py-3">
                        <input
                          type="text"
                          value={row.cosmeticId}
                          disabled={isLocked}
                          aria-label={`ID for ${row.file.name}`}
                          pattern="[a-z0-9][a-z0-9-]{0,79}"
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              cosmeticId: slugifyCosmeticName(event.currentTarget.value),
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[160px] rounded-xl border px-3 py-2"
                        />
                        {(variantCountByCosmeticId.get(row.cosmeticId) ?? 0) > 1 && (
                          <div className="theme-text-tertiary mt-1 text-xs">
                            {variantCountByCosmeticId.get(row.cosmeticId)} variants of this cosmetic
                          </div>
                        )}
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.category}
                          disabled={isLocked}
                          aria-label={`Category for ${row.file.name}`}
                          onChange={(event) => {
                            const category = event.currentTarget.value as DeskCatCosmeticCategory;
                            updateCosmeticGroup(row.rowId, {
                              category,
                              anchorSlot: anchorForCategory(category),
                              status: "ready",
                              message: ""
                            });
                          }}
                          className="theme-input min-w-[120px] rounded-xl border px-3 py-2"
                        >
                          {DESKCAT_COSMETIC_CATEGORIES.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.anchorSlot}
                          disabled={isLocked}
                          aria-label={`Anchor for ${row.file.name}`}
                          onChange={(event) =>
                            updateCosmeticGroup(row.rowId, {
                              anchorSlot: event.currentTarget.value as DeskCatAnchorSlotId,
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[110px] rounded-xl border px-3 py-2"
                        >
                          {ANCHOR_SLOT_OPTIONS.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.purpose}
                          disabled={isLocked}
                          aria-label={`Purpose for ${row.file.name}`}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              purpose: event.currentTarget.value as "preview" | "render",
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[110px] rounded-xl border px-3 py-2"
                        >
                          <option value="render">Render</option>
                          <option value="preview">Preview</option>
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.assetView}
                          disabled={isLocked}
                          aria-label={`View for ${row.file.name}`}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              assetView: event.currentTarget.value as BatchUploadRow["assetView"],
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[110px] rounded-xl border px-3 py-2"
                        >
                          <option value="">Default</option>
                          <option value="front">Front</option>
                          <option value="threeQuarter">3/4</option>
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.poseId}
                          disabled={isLocked}
                          aria-label={`Pose for ${row.file.name}`}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              poseId: event.currentTarget.value as BatchUploadRow["poseId"],
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[120px] rounded-xl border px-3 py-2"
                        >
                          {POSE_OPTIONS.map((pose) => (
                            <option key={pose.id || "all"} value={pose.id}>
                              {pose.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.accessible}
                          disabled={isLocked}
                          aria-label={`App access for ${row.file.name}`}
                          onChange={(event) =>
                            updateRow(row.rowId, {
                              accessible: event.currentTarget.value as "true" | "false",
                              status: "ready",
                              message: ""
                            })
                          }
                          className="theme-input min-w-[130px] rounded-xl border px-3 py-2"
                        >
                          <option value="true">Accessible</option>
                          <option value="false">Hidden</option>
                        </select>
                      </td>
                      <td className="rounded-r-2xl border-y border-r px-3 py-3">
                        <span
                          className={
                            row.status === "error"
                              ? "block max-w-[180px] text-xs font-semibold text-red-300"
                              : row.status === "saved"
                                ? "text-xs font-semibold text-emerald-300"
                                : "theme-text-secondary text-xs font-semibold"
                          }
                        >
                          {statusLabel(row)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSaving || rows.every((row) => row.status === "saved")}
              onClick={saveAll}
              className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Saving batch..." : "Save all uploads"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={clearRows}
              className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:opacity-60"
            >
              Clear table
            </button>
            {message && (
              <span
                role={messageIsError ? "alert" : "status"}
                className={messageIsError ? "text-sm text-red-300" : "theme-text-secondary text-sm"}
              >
                {message}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
