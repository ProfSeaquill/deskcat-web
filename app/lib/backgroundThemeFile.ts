import type { BackgroundSurfaceMode } from "./appearanceCatalog";

export const MAX_BACKGROUND_THEME_FILE_BYTES = 64 * 1024;
export const MAX_BACKGROUND_THEME_BATCH_SIZE = 20;

const MANAGED_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const EXTERNAL_BACKGROUND_PATTERN = /url\s*\(|https?:|data:|blob:/i;

export type BackgroundThemeUpload = {
  id: string;
  label: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  border: string;
  swatches: string[];
  surfaceMode: BackgroundSurfaceMode;
  accessible: boolean;
  sortOrder: number;
};

function getText(
  value: unknown,
  label: string,
  maxLength: number,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const text = value.trim();
  if ((!allowEmpty && text.length === 0) || text.length > maxLength) {
    throw new Error(`${label} must be ${allowEmpty ? `at most ${maxLength}` : `1–${maxLength}`} characters.`);
  }
  return text;
}

export function parseBackgroundThemeFile(value: unknown): BackgroundThemeUpload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The JSON file must contain one background theme object.");
  }

  const record = value as Record<string, unknown>;
  if (record.formatVersion !== undefined && record.formatVersion !== 1) {
    throw new Error("Unsupported background theme format version.");
  }

  const id = getText(record.id, "ID", 80).toLowerCase();
  if (!MANAGED_ID_PATTERN.test(id)) {
    throw new Error("ID must use lowercase letters, numbers, and dashes.");
  }

  const background = getText(record.background, "Background CSS", 500);
  if (EXTERNAL_BACKGROUND_PATTERN.test(background)) {
    throw new Error("Background CSS cannot load external URLs or embedded data.");
  }

  const surfaceMode = record.surfaceMode;
  if (surfaceMode !== "dark" && surfaceMode !== "light") {
    throw new Error("Surface mode must be dark or light.");
  }

  if (!Array.isArray(record.swatches) || record.swatches.length > 6) {
    throw new Error("Swatches must be an array containing no more than six colors.");
  }
  const swatches = record.swatches.map((swatch, index) =>
    getText(swatch, `Swatch ${index + 1}`, 120)
  );

  const accessible = record.accessible ?? true;
  if (typeof accessible !== "boolean") {
    throw new Error("Accessible must be true or false.");
  }

  const sortOrder = record.sortOrder ?? 0;
  if (
    typeof sortOrder !== "number" ||
    !Number.isInteger(sortOrder) ||
    sortOrder < -2_147_483_648 ||
    sortOrder > 2_147_483_647
  ) {
    throw new Error("Sort order must be a whole number.");
  }

  return {
    id,
    label: getText(record.label, "Label", 120),
    description: getText(record.description ?? "", "Description", 500, { allowEmpty: true }),
    background,
    foreground: getText(record.foreground, "Foreground", 120),
    accent: getText(record.accent, "Accent", 120),
    border: getText(record.border, "Border", 160),
    swatches,
    surfaceMode,
    accessible,
    sortOrder
  };
}
