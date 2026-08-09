"use client";

import { useEffect } from "react";
import { APPEARANCE_EVENT, getBackgroundTheme, loadAppearanceSettings } from "../lib/appearance";
import { useAppearanceCatalog } from "./AppearanceCatalogProvider";

function syncAppearanceToDocument(catalog: ReturnType<typeof useAppearanceCatalog>["catalog"]) {
  const theme = getBackgroundTheme(loadAppearanceSettings(catalog).background, catalog);
  const root = document.documentElement;

  root.style.background = theme.background;
  root.style.setProperty("--theme-surface", theme.surface);
  root.style.setProperty("--theme-surface-strong", theme.surfaceStrong);
  root.style.setProperty("--theme-subsurface", theme.subsurface);
  root.style.setProperty("--theme-surface-border", theme.surfaceBorder);
  root.style.setProperty("--theme-text-primary", theme.textPrimary);
  root.style.setProperty("--theme-text-secondary", theme.textSecondary);
  root.style.setProperty("--theme-text-tertiary", theme.textTertiary);
  root.style.setProperty("--theme-link", theme.link);
  root.style.setProperty("--theme-link-hover", theme.linkHover);
  root.style.setProperty("--theme-button-primary-background", theme.buttonPrimaryBackground);
  root.style.setProperty("--theme-button-primary-text", theme.buttonPrimaryText);
  root.style.setProperty("--theme-button-primary-border", theme.buttonPrimaryBorder);
  root.style.setProperty("--theme-button-secondary-background", theme.buttonSecondaryBackground);
  root.style.setProperty("--theme-button-secondary-text", theme.buttonSecondaryText);
  root.style.setProperty("--theme-button-secondary-border", theme.buttonSecondaryBorder);
  root.style.setProperty("--theme-input-background", theme.inputBackground);
  root.style.setProperty("--theme-input-text", theme.inputText);
  root.style.setProperty("--theme-input-border", theme.inputBorder);
  root.style.setProperty("--theme-bubble-background", theme.bubbleBackground);
  root.style.setProperty("--theme-bubble-border", theme.bubbleBorder);
  root.style.setProperty("--theme-bubble-text", theme.bubbleText);
  root.style.setProperty("--theme-surface-shadow", theme.shadow);
  document.body.style.background = theme.background;
  document.body.style.color = theme.foreground;
}

export default function AppearanceController() {
  const { catalog } = useAppearanceCatalog();

  useEffect(() => {
    const handleAppearanceChange = () => {
      syncAppearanceToDocument(catalog);
    };

    handleAppearanceChange();

    window.addEventListener(APPEARANCE_EVENT, handleAppearanceChange);
    window.addEventListener("storage", handleAppearanceChange);

    return () => {
      window.removeEventListener(APPEARANCE_EVENT, handleAppearanceChange);
      window.removeEventListener("storage", handleAppearanceChange);
    };
  }, [catalog]);

  return null;
}
