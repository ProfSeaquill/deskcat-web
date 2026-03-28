"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import deskcatLogo from "@/art/Images/deskcat-logo.png";
import {
  BACKGROUND_OPTIONS,
  DEFAULT_APPEARANCE_SETTINGS,
  getBackgroundTheme,
  loadAppearanceSettings,
  saveAppearanceSettings,
  type DeskCatBackground
} from "../lib/appearance";
import { useIsClient } from "../lib/useIsClient";

export default function MyDeskCatPage() {
  const isClient = useIsClient();

  if (!isClient) {
    const previewTheme = getBackgroundTheme(DEFAULT_APPEARANCE_SETTINGS.background);

    return (
      <main
        className="min-h-screen px-6 py-10 transition-[background,color] duration-300"
        style={{ background: previewTheme.background, color: previewTheme.foreground }}
      >
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div>
            <p className="theme-text-tertiary text-sm font-medium uppercase tracking-[0.2em]">
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

  return <MyDeskCatEditor />;
}

function MyDeskCatEditor() {
  const router = useRouter();
  const [savedBackground, setSavedBackground] = useState<DeskCatBackground>(
    () => loadAppearanceSettings().background
  );
  const [draftBackground, setDraftBackground] = useState<DeskCatBackground>(
    () => loadAppearanceSettings().background
  );

  const previewTheme = getBackgroundTheme(draftBackground);
  const hasChanges = draftBackground !== savedBackground;

  function applyChanges() {
    saveAppearanceSettings({ background: draftBackground });
    setSavedBackground(draftBackground);
    router.push("/");
  }

  return (
    <main
      className="min-h-screen px-6 py-10 transition-[background,color] duration-300"
      style={{ background: previewTheme.background, color: previewTheme.foreground }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <p className="theme-text-tertiary text-sm font-medium uppercase tracking-[0.2em]">
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
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {BACKGROUND_OPTIONS.map((option) => {
                const isSelected = option.id === draftBackground;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDraftBackground(option.id)}
                    className={`theme-hover-highlight flex h-full flex-col rounded-[28px] border p-3 text-left transition ${
                      isSelected
                        ? "theme-surface-strong shadow-lg"
                        : "theme-subsurface"
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
                  Your selected background will show up here after you apply it.
                </p>

                <div
                  className="mt-5 flex justify-center rounded-[24px] border p-4"
                  style={{
                    background: previewTheme.subsurface,
                    borderColor: previewTheme.surfaceBorder
                  }}
                >
                  <Image
                    src={deskcatLogo}
                    alt="DeskCat logo preview"
                    width={180}
                    height={180}
                    className="h-auto w-[10.5rem] drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                  />
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

        <div className="grid gap-6 md:grid-cols-2">
          <section className="theme-surface rounded-[32px] border p-6 backdrop-blur">
            <h2 className="theme-text-primary text-2xl font-semibold">Cosmetics</h2>
            <p className="theme-text-secondary mt-3 text-sm">
              Hats, collars, accessories, and other cat-specific unlocks can live here next.
            </p>
          </section>

          <section className="theme-surface rounded-[32px] border p-6 backdrop-blur">
            <h2 className="theme-text-primary text-2xl font-semibold">Emotes</h2>
            <p className="theme-text-secondary mt-3 text-sm">
              This section is ready for future animations, reactions, and idle behaviors.
            </p>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/"
            className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-medium transition"
          >
            Back
          </Link>

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
