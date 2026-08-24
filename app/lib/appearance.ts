import {
  EMPTY_APPEARANCE_CATALOG,
  FALLBACK_BACKGROUND_THEME,
  getManagedCosmetic,
  type AppearanceCatalog
} from "./appearanceCatalog";
import {
  DEFAULT_DESKCAT_GLASSES_ID,
  NONE_DESKCAT_COSMETIC_ID,
  createDefaultDeskCatCosmetics,
  type DeskCatCosmeticCategory,
  type DeskCatCosmeticSelection,
  type DeskCatEquippedCosmetics
} from "./deskcatSprite";

export type DeskCatBackground = string;

export type AppearanceSettings = {
  background: DeskCatBackground;
  cosmetics: DeskCatEquippedCosmetics;
};

export const APPEARANCE_EVENT = "deskcat.appearance.change";

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  background: "",
  cosmetics: createDefaultDeskCatCosmetics()
};

const APPEARANCE_KEY = "deskcat.appearance.v1";
let cachedAppearanceKey: string | null = null;
let cachedAppearanceSettings: AppearanceSettings = DEFAULT_APPEARANCE_SETTINGS;

function normalizeBackground(value: unknown, catalog: AppearanceCatalog): DeskCatBackground {
  if (
    typeof value === "string" &&
    catalog.backgrounds.some((background) => background.id === value)
  ) {
    return value;
  }
  return catalog.backgrounds[0]?.id ?? "";
}

function normalizeCosmeticSelection(
  category: DeskCatCosmeticCategory,
  value: unknown,
  catalog: AppearanceCatalog
): DeskCatCosmeticSelection {
  const fallback =
    category === "glasses" ? DEFAULT_DESKCAT_GLASSES_ID : NONE_DESKCAT_COSMETIC_ID;
  if (value === NONE_DESKCAT_COSMETIC_ID) return fallback;
  if (typeof value !== "string") return fallback;

  const cosmetic = getManagedCosmetic(catalog, value);
  return cosmetic?.category === category ? value : fallback;
}

function normalizeCosmetics(
  value: unknown,
  catalog: AppearanceCatalog
): DeskCatEquippedCosmetics {
  if (!value || typeof value !== "object") return createDefaultDeskCatCosmetics();
  const parsed = value as Record<string, unknown>;

  return {
    head: normalizeCosmeticSelection("head", parsed.head, catalog),
    neck: normalizeCosmeticSelection("neck", parsed.neck, catalog),
    tail: normalizeCosmeticSelection("tail", parsed.tail, catalog),
    glasses: normalizeCosmeticSelection("glasses", parsed.glasses, catalog)
  };
}

function migrateLegacyCosmetic(value: unknown, catalog: AppearanceCatalog) {
  const migrated = createDefaultDeskCatCosmetics();
  if (typeof value !== "string") return migrated;

  const cosmetic = getManagedCosmetic(catalog, value);
  if (cosmetic) migrated[cosmetic.category] = cosmetic.id;
  return migrated;
}

export function normalizeAppearanceSettings(
  value: Partial<AppearanceSettings> | null | undefined,
  catalog: AppearanceCatalog
): AppearanceSettings {
  return {
    background: normalizeBackground(value?.background, catalog),
    cosmetics: normalizeCosmetics(value?.cosmetics, catalog)
  };
}

export function getBackgroundTheme(background: DeskCatBackground, catalog: AppearanceCatalog) {
  return (
    catalog.backgrounds.find((option) => option.id === background) ??
    catalog.backgrounds[0] ??
    FALLBACK_BACKGROUND_THEME
  );
}

let cachedFallbackRevision: string | null = null;
let cachedFallbackSettings: AppearanceSettings = DEFAULT_APPEARANCE_SETTINGS;

// useSyncExternalStore compares snapshots by reference, so every return path here has to hand
// back a stable object. A freshly normalized fallback on each call re-renders forever.
function getFallbackSettings(catalog: AppearanceCatalog): AppearanceSettings {
  if (cachedFallbackRevision !== catalog.revision) {
    cachedFallbackRevision = catalog.revision;
    cachedFallbackSettings = normalizeAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS, catalog);
  }
  return cachedFallbackSettings;
}

export function loadAppearanceSettings(catalog: AppearanceCatalog): AppearanceSettings {
  const fallback = getFallbackSettings(catalog);
  if (typeof window === "undefined") return fallback;

  // The provider begins with a deliberately empty placeholder while the managed catalog loads.
  // Do not let that temporary state erase valid saved IDs before the first request completes.
  if (catalog.revision === EMPTY_APPEARANCE_CATALOG.revision) return fallback;

  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    const cacheKey = `${catalog.revision}:${raw ?? ""}`;
    if (cacheKey === cachedAppearanceKey) return cachedAppearanceSettings;

    const parsed = raw ? JSON.parse(raw) : null;
    const normalized: AppearanceSettings = {
      background: normalizeBackground(parsed?.background, catalog),
      cosmetics: parsed?.cosmetics
        ? normalizeCosmetics(parsed.cosmetics, catalog)
        : migrateLegacyCosmetic(parsed?.cosmetic, catalog)
    };
    const normalizedRaw = JSON.stringify(normalized);

    cachedAppearanceKey = `${catalog.revision}:${normalizedRaw}`;
    cachedAppearanceSettings = normalized;
    if (raw !== normalizedRaw) localStorage.setItem(APPEARANCE_KEY, normalizedRaw);
    return normalized;
  } catch {
    const normalizedRaw = JSON.stringify(fallback);
    try {
      localStorage.setItem(APPEARANCE_KEY, normalizedRaw);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); keep the fallback in memory.
    }
    cachedAppearanceKey = `${catalog.revision}:${normalizedRaw}`;
    cachedAppearanceSettings = fallback;
    return fallback;
  }
}

export function saveAppearanceSettings(
  settings: AppearanceSettings,
  catalog: AppearanceCatalog
) {
  if (typeof window === "undefined") return;

  const normalized = normalizeAppearanceSettings(settings, catalog);
  const raw = JSON.stringify(normalized);
  cachedAppearanceKey = `${catalog.revision}:${raw}`;
  cachedAppearanceSettings = normalized;
  localStorage.setItem(APPEARANCE_KEY, raw);
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}
