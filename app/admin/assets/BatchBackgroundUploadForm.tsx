"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  MAX_BACKGROUND_THEME_BATCH_SIZE,
  MAX_BACKGROUND_THEME_FILE_BYTES,
  parseBackgroundThemeFile,
  type BackgroundThemeUpload
} from "../../lib/backgroundThemeFile";

type UploadStatus = "ready" | "saving" | "saved" | "error";

type BackgroundUploadRow = {
  rowId: string;
  fileName: string;
  theme: BackgroundThemeUpload | null;
  status: UploadStatus;
  message: string;
};

function statusLabel(row: BackgroundUploadRow) {
  switch (row.status) {
    case "saving":
      return "Saving";
    case "saved":
      return "Saved";
    case "error":
      return row.message || "Invalid file";
    default:
      return "Ready";
  }
}

export default function BatchBackgroundUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BackgroundUploadRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  function updateRow(rowId: string, update: Partial<BackgroundUploadRow>) {
    setRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...update } : row))
    );
  }

  function updateTheme(rowId: string, update: Partial<BackgroundThemeUpload>) {
    setRows((current) =>
      current.map((row) =>
        row.rowId === rowId && row.theme
          ? { ...row, theme: { ...row.theme, ...update }, status: "ready", message: "" }
          : row
      )
    );
  }

  async function handleFiles(files: FileList | null) {
    setMessage("");
    setMessageIsError(false);

    if (!files || files.length === 0) {
      setRows([]);
      return;
    }

    const selectedFiles = Array.from(files).slice(0, MAX_BACKGROUND_THEME_BATCH_SIZE);
    const nextRows = await Promise.all(
      selectedFiles.map(async (file, index): Promise<BackgroundUploadRow> => {
        const rowId = `${file.name}:${file.size}:${file.lastModified}:${index}`;
        if (!file.name.toLowerCase().endsWith(".json")) {
          return {
            rowId,
            fileName: file.name,
            theme: null,
            status: "error",
            message: "Use a .json file."
          };
        }
        if (file.size <= 0 || file.size > MAX_BACKGROUND_THEME_FILE_BYTES) {
          return {
            rowId,
            fileName: file.name,
            theme: null,
            status: "error",
            message: "JSON must be no larger than 64 KB."
          };
        }

        try {
          const theme = parseBackgroundThemeFile(JSON.parse(await file.text()));
          return { rowId, fileName: file.name, theme, status: "ready", message: "" };
        } catch (error) {
          return {
            rowId,
            fileName: file.name,
            theme: null,
            status: "error",
            message: error instanceof Error ? error.message : "Invalid JSON."
          };
        }
      })
    );

    setRows(nextRows);
    if (files.length > MAX_BACKGROUND_THEME_BATCH_SIZE) {
      setMessage(`Only the first ${MAX_BACKGROUND_THEME_BATCH_SIZE} files were added.`);
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
    const pendingRows = rows.filter((row) => row.status !== "saved" && row.theme);
    if (pendingRows.length === 0) return;

    setIsSaving(true);
    setMessage("");
    setMessageIsError(false);
    let savedCount = 0;
    let failedCount = rows.filter((row) => !row.theme && row.status !== "saved").length;

    for (const row of pendingRows) {
      if (!row.theme) continue;

      let theme;
      try {
        theme = parseBackgroundThemeFile(row.theme);
      } catch (error) {
        updateRow(row.rowId, {
          status: "error",
          message: error instanceof Error ? error.message : "Invalid background."
        });
        failedCount += 1;
        continue;
      }

      updateRow(row.rowId, { status: "saving", message: "" });
      try {
        const response = await fetch("/api/admin/backgrounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(theme)
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not save background.");

        updateRow(row.rowId, { status: "saved", message: "" });
        savedCount += 1;
      } catch (error) {
        updateRow(row.rowId, {
          status: "error",
          message: error instanceof Error ? error.message : "Could not save background."
        });
        failedCount += 1;
      }
    }

    setIsSaving(false);
    if (savedCount > 0) router.refresh();

    if (failedCount > 0) {
      setMessage(`${savedCount} saved, ${failedCount} failed. Fix or replace the failed files and retry.`);
      setMessageIsError(true);
    } else {
      setMessage(`${savedCount} background${savedCount === 1 ? "" : "s"} saved.`);
      setMessageIsError(false);
    }
  }

  return (
    <section className="theme-surface rounded-[28px] border p-6 backdrop-blur">
      <h2 className="theme-text-primary text-2xl font-semibold">Batch Upload Backgrounds</h2>
      <p className="theme-text-secondary mt-2 text-sm">
        Select up to {MAX_BACKGROUND_THEME_BATCH_SIZE} DeskCat background JSON files, review their
        previews and settings, then save them together. An existing ID is updated.
      </p>

      <label className="theme-text-secondary mt-5 block text-sm font-medium">
        Background JSON files
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          disabled={isSaving}
          onChange={(event) => void handleFiles(event.currentTarget.files)}
          className="theme-input mt-2 w-full rounded-xl border px-3 py-2"
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-y-3 text-left text-sm">
              <thead className="theme-text-tertiary">
                <tr>
                  <th className="px-3 py-2 font-semibold">File</th>
                  <th className="px-3 py-2 font-semibold">Preview</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Mode</th>
                  <th className="px-3 py-2 font-semibold">App access</th>
                  <th className="px-3 py-2 font-semibold">Order</th>
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
                          {row.fileName}
                        </div>
                      </td>
                      <td className="border-y px-3 py-3">
                        {row.theme ? (
                          <div
                            className="h-14 w-28 rounded-xl border"
                            style={{
                              background: row.theme.background,
                              borderColor: row.theme.border
                            }}
                          />
                        ) : (
                          <span className="theme-text-tertiary">Unavailable</span>
                        )}
                      </td>
                      <td className="border-y px-2 py-3">
                        <input
                          value={row.theme?.label ?? ""}
                          disabled={isLocked || !row.theme}
                          onChange={(event) => updateTheme(row.rowId, { label: event.target.value })}
                          className="theme-input min-w-[170px] rounded-xl border px-3 py-2"
                        />
                      </td>
                      <td className="border-y px-2 py-3">
                        <input
                          value={row.theme?.id ?? ""}
                          disabled={isLocked || !row.theme}
                          onChange={(event) => updateTheme(row.rowId, { id: event.target.value })}
                          className="theme-input min-w-[140px] rounded-xl border px-3 py-2"
                        />
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.theme?.surfaceMode ?? "dark"}
                          disabled={isLocked || !row.theme}
                          onChange={(event) =>
                            updateTheme(row.rowId, {
                              surfaceMode: event.target.value as "dark" | "light"
                            })
                          }
                          className="theme-input min-w-[120px] rounded-xl border px-3 py-2"
                        >
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <select
                          value={row.theme?.accessible ? "true" : "false"}
                          disabled={isLocked || !row.theme}
                          onChange={(event) =>
                            updateTheme(row.rowId, { accessible: event.target.value === "true" })
                          }
                          className="theme-input min-w-[140px] rounded-xl border px-3 py-2"
                        >
                          <option value="true">Accessible</option>
                          <option value="false">Hidden</option>
                        </select>
                      </td>
                      <td className="border-y px-2 py-3">
                        <input
                          type="number"
                          step="1"
                          value={row.theme?.sortOrder ?? 0}
                          disabled={isLocked || !row.theme}
                          onChange={(event) =>
                            updateTheme(row.rowId, { sortOrder: Number(event.target.value) })
                          }
                          className="theme-input w-24 rounded-xl border px-3 py-2"
                        />
                      </td>
                      <td className="rounded-r-2xl border-y border-r px-3 py-3">
                        <span
                          className={
                            row.status === "error"
                              ? "text-red-300"
                              : row.status === "saved"
                                ? "text-emerald-300"
                                : "theme-text-secondary"
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
              onClick={() => void saveAll()}
              disabled={isSaving || !rows.some((row) => row.theme && row.status !== "saved")}
              className="theme-button-primary theme-hover-highlight rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving backgrounds..." : "Save all backgrounds"}
            </button>
            <button
              type="button"
              onClick={clearRows}
              disabled={isSaving}
              className="theme-button-secondary theme-hover-highlight rounded-2xl border px-5 py-3 font-semibold transition"
            >
              Clear
            </button>
            {message && (
              <p className={messageIsError ? "text-sm text-red-300" : "text-sm text-emerald-300"}>
                {message}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
