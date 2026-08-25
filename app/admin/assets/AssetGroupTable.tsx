"use client";

import { useState } from "react";

export type AssetVariantRow = {
  id: string;
  variantLabel: string;
  isPrimaryView: boolean;
  storageKey: string;
  url: string;
  sizeLabel: string;
  accessible: boolean;
  usedByPoses: string;
};

export type AssetGroupRow = {
  cosmeticId: string;
  label: string;
  category: string;
  anchorSlot: string;
  released: boolean;
  variants: AssetVariantRow[];
  warnings: string[];
};

export default function AssetGroupTable({ groups }: { groups: AssetGroupRow[] }) {
  const [accessByAssetId, setAccessByAssetId] = useState<Record<string, "true" | "false">>(() =>
    Object.fromEntries(
      groups.flatMap((group) =>
        group.variants.map((variant) => [variant.id, variant.accessible ? "true" : "false"] as const)
      )
    )
  );
  const [deleteByAssetId, setDeleteByAssetId] = useState<Record<string, boolean>>({});
  const [releasedByCosmeticId, setReleasedByCosmeticId] = useState<Record<string, "true" | "false">>(
    () =>
      Object.fromEntries(
        groups.map((group) => [group.cosmeticId, group.released ? "true" : "false"] as const)
      )
  );

  function setGroupAccess(group: AssetGroupRow, value: "true" | "false") {
    setAccessByAssetId((current) => {
      const next = { ...current };
      for (const variant of group.variants) next[variant.id] = value;
      return next;
    });
  }

  function groupAccessValue(group: AssetGroupRow) {
    const values = new Set(group.variants.map((variant) => accessByAssetId[variant.id]));
    return values.size === 1 ? [...values][0] : "";
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupAccess = groupAccessValue(group);
        const released = releasedByCosmeticId[group.cosmeticId] ?? "true";
        const isPreviewOnly = released === "false";

        return (
          <div key={group.cosmeticId} className="theme-subsurface rounded-2xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="theme-text-primary text-lg font-semibold">{group.label}</h3>
                <p className="theme-text-tertiary mt-1 text-xs">
                  {group.cosmeticId} · <span className="capitalize">{group.category}</span> ·{" "}
                  <span className="capitalize">{group.anchorSlot}</span> anchor ·{" "}
                  {group.variants.length} variant{group.variants.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="theme-text-secondary text-sm font-medium">
                  Availability
                  <input type="hidden" name="releaseCosmeticId" value={group.cosmeticId} />
                  <select
                    name={`released:${group.cosmeticId}`}
                    value={released}
                    onChange={(event) =>
                      setReleasedByCosmeticId((current) => ({
                        ...current,
                        [group.cosmeticId]: event.currentTarget.value as "true" | "false"
                      }))
                    }
                    className="theme-input mt-1 block min-w-[190px] rounded-xl border px-3 py-2"
                  >
                    <option value="true">Available now</option>
                    <option value="false">Coming soon (preview only)</option>
                  </select>
                </label>

                <label className="theme-text-secondary text-sm font-medium">
                  Set all variants
                  <select
                    value={groupAccess}
                    onChange={(event) =>
                      setGroupAccess(group, event.currentTarget.value as "true" | "false")
                    }
                    className="theme-input mt-1 block min-w-[150px] rounded-xl border px-3 py-2"
                  >
                    {groupAccess === "" && <option value="">Mixed</option>}
                    <option value="true">Accessible</option>
                    <option value="false">Hidden</option>
                  </select>
                </label>
              </div>
            </div>

            {isPreviewOnly && (
              <p className="theme-text-secondary mt-3 rounded-xl border border-sky-400/40 bg-sky-950/20 p-3 text-xs">
                Preview only. This accessory can appear in the donation meter&apos;s reward
                preview, but nobody can equip it in My DeskCat yet. Keep its variants accessible
                so the preview image can load.
              </p>
            )}

            {group.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl border border-amber-400/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                {group.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="theme-text-tertiary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Variant</th>
                    <th className="px-3 py-2 font-semibold">Used by poses</th>
                    <th className="px-3 py-2 font-semibold">File</th>
                    <th className="px-3 py-2 font-semibold">Size</th>
                    <th className="px-3 py-2 font-semibold">App access</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.variants.map((variant) => (
                    <tr key={variant.id} className="theme-subsurface">
                      <td className="rounded-l-2xl border-y border-l px-3 py-3">
                        <span className="theme-text-primary font-semibold">
                          {variant.variantLabel}
                        </span>
                      </td>
                      <td className="theme-text-secondary border-y px-3 py-3">
                        {variant.usedByPoses || (variant.isPrimaryView ? "None" : "—")}
                      </td>
                      <td className="border-y px-3 py-3">
                        {variant.url ? (
                          <a
                            href={variant.url}
                            target="_blank"
                            rel="noreferrer"
                            className="theme-link block max-w-[260px] truncate text-xs"
                          >
                            {variant.storageKey}
                          </a>
                        ) : (
                          <span className="theme-text-tertiary block max-w-[260px] truncate text-xs">
                            {variant.storageKey}
                          </span>
                        )}
                      </td>
                      <td className="theme-text-secondary border-y px-3 py-3">
                        {variant.sizeLabel}
                      </td>
                      <td className="border-y px-3 py-3">
                        <input type="hidden" name="assetId" value={variant.id} />
                        <input
                          type="hidden"
                          name={`assetSource:${variant.id}`}
                          value="database"
                        />
                        <select
                          name={`accessible:${variant.id}`}
                          value={accessByAssetId[variant.id] ?? "true"}
                          aria-label={`App access for ${group.label} ${variant.variantLabel}`}
                          onChange={(event) =>
                            setAccessByAssetId((current) => ({
                              ...current,
                              [variant.id]: event.currentTarget.value as "true" | "false"
                            }))
                          }
                          className="theme-input w-full min-w-[150px] rounded-xl border px-3 py-2"
                        >
                          <option value="true">Accessible</option>
                          <option value="false">Hidden</option>
                        </select>
                      </td>
                      <td className="rounded-r-2xl border-y border-r px-3 py-3">
                        <label className="theme-text-secondary flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name={`delete:${variant.id}`}
                            checked={deleteByAssetId[variant.id] ?? false}
                            onChange={(event) =>
                              setDeleteByAssetId((current) => ({
                                ...current,
                                [variant.id]: event.currentTarget.checked
                              }))
                            }
                            className="h-4 w-4 accent-red-400"
                          />
                          Delete
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
