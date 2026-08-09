"use client";

import Image from "next/image";
import { useState } from "react";
import PageBackLink from "../components/PageBackLink";
import DeskCatSprite from "../components/DeskCatSprite";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  getBackgroundTheme,
  loadAppearanceSettings,
  saveAppearanceSettings,
  type DeskCatBackground
} from "../lib/appearance";
import {
  DESKCAT_COSMETIC_CATEGORIES,
  type DeskCatCosmeticCategory,
  type DeskCatCosmeticSelection,
  type DeskCatEquippedCosmetics
} from "../lib/deskcatSprite";
import {
  getManagedCosmeticsForCategory,
  type BackgroundTheme,
  type ManagedImageAsset
} from "../lib/appearanceCatalog";
import { useIsClient } from "../lib/useIsClient";
import { useAppearanceCatalog } from "../components/AppearanceCatalogProvider";

const BACKGROUND_PREVIEW_COUNT = 6;

function areCosmeticsEqual(left: DeskCatEquippedCosmetics, right: DeskCatEquippedCosmetics) {
  return DESKCAT_COSMETIC_CATEGORIES.every(
    (category) => left[category.id] === right[category.id]
  );
}

function getNoneDescription(category: DeskCatCosmeticCategory) {
  switch (category) {
    case "head":
      return "Leave DeskCat's head clear.";
    case "neck":
      return "Leave DeskCat's neck clear.";
    case "tail":
      return "Leave DeskCat's tail clear.";
    case "glasses":
      return "Leave DeskCat's face free of eyewear.";
  }
}

export default function MyDeskCatPage() {
  const isClient = useIsClient();
  const { catalog, isLoading, error } = useAppearanceCatalog();

  if (!isClient) {
    const previewTheme = getBackgroundTheme(DEFAULT_APPEARANCE_SETTINGS.background, catalog);

    return (
      <main
        className="min-h-screen px-6 py-10 transition-[background,color] duration-300"
        style={{ background: previewTheme.background, color: previewTheme.foreground }}
      >
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex justify-start">
            <PageBackLink href="/" />
          </div>

          <div>
            <p className="theme-eyebrow-badge w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
              Appearance Lab
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">My DeskCat</h1>
          </div>

          <div className="theme-surface rounded-[32px] border p-6 text-sm backdrop-blur">
            Loading your customization space...
          </div>
        </div>
      </main>
    );
  }

  return (
    <MyDeskCatEditor
      key={catalog.revision}
      catalog={catalog}
      isLoading={isLoading}
      error={error}
    />
  );
}

function MyDeskCatEditor({
  catalog,
  isLoading,
  error
}: Pick<ReturnType<typeof useAppearanceCatalog>, "catalog" | "isLoading" | "error">) {
  const [savedBackground, setSavedBackground] = useState<DeskCatBackground>(
    () => loadAppearanceSettings(catalog).background
  );
  const [draftBackground, setDraftBackground] = useState<DeskCatBackground>(
    () => loadAppearanceSettings(catalog).background
  );
  const [savedCosmetics, setSavedCosmetics] = useState<DeskCatEquippedCosmetics>(
    () => loadAppearanceSettings(catalog).cosmetics
  );
  const [draftCosmetics, setDraftCosmetics] = useState<DeskCatEquippedCosmetics>(
    () => loadAppearanceSettings(catalog).cosmetics
  );
  const [showAllBackgrounds, setShowAllBackgrounds] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<DeskCatCosmeticCategory | null>(null);

  const previewTheme = getBackgroundTheme(draftBackground, catalog);
  const hasChanges =
    draftBackground !== savedBackground || !areCosmeticsEqual(draftCosmetics, savedCosmetics);
  const canExpandBackgrounds = catalog.backgrounds.length > BACKGROUND_PREVIEW_COUNT;
  const visibleBackgrounds = showAllBackgrounds
    ? catalog.backgrounds
    : catalog.backgrounds.slice(0, BACKGROUND_PREVIEW_COUNT);

  function applyChanges() {
    saveAppearanceSettings({
      background: draftBackground,
      cosmetics: draftCosmetics
    }, catalog);
    setSavedBackground(draftBackground);
    setSavedCosmetics(draftCosmetics);
  }

  function updateCosmetic(
    category: DeskCatCosmeticCategory,
    selection: DeskCatCosmeticSelection
  ) {
    setDraftCosmetics((current) => ({
      ...current,
      [category]: selection
    }));
  }

  return (
    <main
      className="min-h-screen px-6 py-10 transition-[background,color] duration-300"
      style={{ background: previewTheme.background, color: previewTheme.foreground }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex justify-start">
          <PageBackLink href="/" />
        </div>

        <div>
          <p className="theme-eyebrow-badge w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
            Appearance Lab
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">My DeskCat</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="theme-surface rounded-[32px] border p-6 backdrop-blur">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="theme-text-primary text-2xl font-semibold">Backgrounds</h2>
                <p className="theme-text-secondary mt-2 max-w-xl text-sm">
                  Pick the backdrop that shows up across DeskCat after you confirm your changes.
                </p>
              </div>

              {canExpandBackgrounds && (
                <button
                  type="button"
                  onClick={() => setShowAllBackgrounds((value) => !value)}
                  className="theme-button-secondary theme-hover-highlight shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium transition"
                >
                  {showAllBackgrounds ? "Show fewer" : "View all"}
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {!isLoading && visibleBackgrounds.length === 0 && (
                <p className="theme-text-secondary text-sm sm:col-span-3">
                  No managed backgrounds are currently available.
                </p>
              )}
              {visibleBackgrounds.map((option) => {
                const isSelected = option.id === draftBackground;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraftBackground(option.id)}
                    className={`theme-hover-highlight flex h-full flex-col rounded-[28px] border p-3 text-left transition ${
                      isSelected ? "theme-surface-strong shadow-lg" : "theme-subsurface"
                    }`}
                  >
                    <div
                      className="h-28 shrink-0 rounded-2xl border"
                      style={{
                        background: option.background,
                        borderColor: option.border
                      }}
                    />

                    <div className="mt-4 flex flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="theme-text-primary font-semibold">{option.label}</h3>
                        <p className="theme-text-secondary mt-1 text-sm">{option.description}</p>
                      </div>

                      <span
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "theme-button-primary"
                            : "theme-subsurface text-transparent"
                        }`}
                      >
                        •
                      </span>
                    </div>

                    <div className="mt-auto flex gap-2 pt-4">
                      {option.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="theme-surface rounded-[32px] border p-6 backdrop-blur">
            <p className="theme-text-tertiary text-sm font-medium uppercase tracking-[0.2em]">
              Live Preview
            </p>
            <div
              className="mt-5 rounded-[28px] border p-5 shadow-inner"
              style={{
                background: previewTheme.background,
                color: previewTheme.foreground,
                borderColor: previewTheme.border
              }}
            >
              <div
                className="rounded-[24px] border p-4 shadow-sm backdrop-blur-sm"
                style={{
                  background: previewTheme.surface,
                  borderColor: previewTheme.surfaceBorder,
                  color: previewTheme.textPrimary
                }}
              >
                <p
                  className="text-sm font-medium uppercase tracking-[0.2em]"
                  style={{ color: previewTheme.textTertiary }}
                >
                  Home Screen
                </p>
                <h3 className="mt-3 text-2xl font-semibold">DeskCat</h3>
                <p className="mt-2 text-sm" style={{ color: previewTheme.textSecondary }}>
                  This preview updates immediately while you try backgrounds and cosmetics.
                </p>

                <div
                  className="mt-5 flex justify-center rounded-[24px] border p-4"
                  style={{
                    background: previewTheme.subsurface,
                    borderColor: previewTheme.surfaceBorder
                  }}
                >
                  <div className="h-[180px] w-[180px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
                    <DeskCatSprite
                      poseId="reading"
                      cosmetics={draftCosmetics}
                      alt="DeskCat preview"
                      sizes="180px"
                    />
                  </div>
                </div>

                <div
                  className="mt-5 rounded-[24px] border p-4"
                  style={{
                    background: previewTheme.subsurface,
                    borderColor: previewTheme.surfaceBorder
                  }}
                >
                  <div className="text-sm" style={{ color: previewTheme.link }}>
                    Reward 3
                  </div>
                  <div
                    className="mt-2 h-3 rounded-full"
                    style={{ backgroundColor: `${previewTheme.surfaceBorder}` }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: "66%", backgroundColor: previewTheme.accent }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="theme-surface rounded-[32px] border p-6 backdrop-blur">
          <div>
            <h2 className="theme-text-primary text-2xl font-semibold">Cosmetics</h2>
            <p className="theme-text-secondary mt-3 max-w-3xl text-sm">
              Mix and match one accessible, uploaded cosmetic from each category.
            </p>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {DESKCAT_COSMETIC_CATEGORIES.map((category) => {
              const options = getManagedCosmeticsForCategory(catalog, category.id);
              const selectedCosmetic = draftCosmetics[category.id];
              const isExpanded = expandedCategory === category.id;
              const selectedOption = options.find((option) => option.id === selectedCosmetic);
              const selectedLabel = selectedOption?.label ?? "None";

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setExpandedCategory((current) => (current === category.id ? null : category.id))
                  }
                  aria-expanded={isExpanded}
                  className={`theme-hover-highlight flex h-full flex-col rounded-[28px] border p-3 text-left transition ${
                    isExpanded ? "theme-surface-strong shadow-lg" : "theme-subsurface"
                  }`}
                >
                  <div
                    className="flex h-28 shrink-0 items-center justify-center rounded-2xl border p-3"
                    style={{
                      background: previewTheme.surface,
                      borderColor: previewTheme.surfaceBorder
                    }}
                  >
                    {selectedOption ? (
                      <Image
                        src={selectedOption.previewSrc.src}
                        alt={selectedOption.label}
                        width={selectedOption.previewSrc.width}
                        height={selectedOption.previewSrc.height}
                        unoptimized
                        className="h-auto max-h-24 w-auto object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-1 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="theme-text-primary font-semibold">{category.label}</h3>
                      <p className="theme-text-secondary mt-1 text-sm">{category.description}</p>
                      <p className="theme-text-primary mt-3 text-sm font-medium">
                        Equipped: <span className="theme-text-secondary">{selectedLabel}</span>
                      </p>
                    </div>

                    <span className="theme-text-secondary mt-1 shrink-0 text-sm font-medium">
                      {isExpanded ? "Hide" : "Choose"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {expandedCategory && (
            <div className="theme-subsurface mt-5 rounded-[28px] border p-4">
              {(() => {
                const category = DESKCAT_COSMETIC_CATEGORIES.find(
                  (entry) => entry.id === expandedCategory
                );

                if (!category) return null;

                const options = getManagedCosmeticsForCategory(catalog, category.id);
                const selectedCosmetic = draftCosmetics[category.id];
                const allowsNone = true;

                return (
                  <>
                    <div className="mb-4">
                      <h3 className="theme-text-primary text-xl font-semibold">{category.label}</h3>
                      <p className="theme-text-secondary mt-1 text-sm">{category.description}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {allowsNone && (
                        <CosmeticChoiceCard
                          label="None"
                          description={getNoneDescription(category.id)}
                          isSelected={selectedCosmetic === "none"}
                          onClick={() => updateCosmetic(category.id, "none")}
                          previewTheme={previewTheme}
                        />
                      )}

                      {options.map((option) => (
                        <CosmeticChoiceCard
                          key={option.id}
                          label={option.label}
                          description={option.description}
                          previewSrc={option.previewSrc}
                          isSelected={selectedCosmetic === option.id}
                          onClick={() => updateCosmetic(category.id, option.id)}
                          previewTheme={previewTheme}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={applyChanges}
            disabled={!hasChanges}
            className={`inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
              hasChanges
                ? "theme-button-primary theme-hover-highlight"
                : "cursor-not-allowed border-white/10 bg-white/10 text-white/35"
            }`}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </main>
  );
}

function CosmeticChoiceCard({
  label,
  description,
  isSelected,
  onClick,
  previewTheme,
  previewSrc
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  previewTheme: BackgroundTheme;
  previewSrc?: ManagedImageAsset;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`theme-hover-highlight flex h-full flex-col rounded-[24px] border p-4 text-left transition ${
        isSelected ? "theme-surface-strong shadow-lg" : "theme-surface"
      }`}
    >
      {previewSrc ? (
        <div
          className="flex min-h-[8rem] items-center justify-center rounded-[22px] border p-3"
          style={{
            background: previewTheme.surface,
            borderColor: previewTheme.surfaceBorder
          }}
        >
          <Image
            src={previewSrc.src}
            alt={label}
            width={previewSrc.width}
            height={previewSrc.height}
            unoptimized
            className="h-auto max-h-24 w-auto object-contain"
          />
        </div>
      ) : (
        <div
          className="flex min-h-[8rem] items-center justify-center rounded-[22px] border text-sm font-medium uppercase tracking-[0.2em]"
          style={{
            background: previewTheme.surface,
            borderColor: previewTheme.surfaceBorder,
            color: previewTheme.textTertiary
          }}
        >
          None
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="theme-text-primary font-semibold">{label}</h3>
          <p className="theme-text-secondary mt-2 text-sm">{description}</p>
        </div>

        <span
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            isSelected ? "theme-button-primary" : "theme-subsurface text-transparent"
          }`}
        >
          •
        </span>
      </div>
    </button>
  );
}
