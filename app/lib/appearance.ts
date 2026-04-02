import {
  DEFAULT_DESKCAT_COSMETIC_ID,
  isDeskCatCosmeticId,
  type DeskCatCosmeticId
} from "./deskcatSprite";

export type DeskCatBackground =
  | "black"
  | "default"
  | "green"
  | "lime"
  | "cabin"
  | "lavender"
  | "polka"
  | "rose"
  | "orange";

export type AppearanceSettings = {
  background: DeskCatBackground;
  cosmetic: DeskCatCosmeticId;
};

export type BackgroundTheme = {
  id: DeskCatBackground;
  label: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  border: string;
  swatches: string[];
  surface: string;
  surfaceStrong: string;
  subsurface: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  link: string;
  linkHover: string;
  buttonPrimaryBackground: string;
  buttonPrimaryText: string;
  buttonPrimaryBorder: string;
  buttonSecondaryBackground: string;
  buttonSecondaryText: string;
  buttonSecondaryBorder: string;
  inputBackground: string;
  inputText: string;
  inputBorder: string;
  bubbleBackground: string;
  bubbleBorder: string;
  bubbleText: string;
  shadow: string;
};

export const APPEARANCE_EVENT = "deskcat.appearance.change";

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  background: "black",
  cosmetic: DEFAULT_DESKCAT_COSMETIC_ID
};

const APPEARANCE_KEY = "deskcat.appearance.v1";

const LIGHT_SURFACE_THEME = {
  surface: "rgba(255, 255, 255, 0.82)",
  surfaceStrong: "#ffffff",
  subsurface: "#f8fafc",
  surfaceBorder: "rgba(255, 255, 255, 0.68)",
  textPrimary: "#172033",
  textSecondary: "#5d6879",
  textTertiary: "#7d8797",
  link: "#0f6a98",
  linkHover: "#0a587d",
  buttonPrimaryBackground: "#020617",
  buttonPrimaryText: "#ffffff",
  buttonPrimaryBorder: "rgba(255, 255, 255, 0.18)",
  buttonSecondaryBackground: "#eff6ff",
  buttonSecondaryText: "#075985",
  buttonSecondaryBorder: "#bfdbfe",
  inputBackground: "#ffffff",
  inputText: "#172033",
  inputBorder: "#cbd5e1",
  bubbleBackground: "#fffdf8",
  bubbleBorder: "rgba(214, 211, 204, 0.8)",
  bubbleText: "#1c1917",
  shadow: "rgba(15, 23, 42, 0.1)"
} as const;

const DARK_SURFACE_THEME = {
  surface: "rgba(10, 14, 22, 0.78)",
  surfaceStrong: "rgba(15, 21, 34, 0.96)",
  subsurface: "rgba(17, 25, 43, 0.94)",
  surfaceBorder: "rgba(122, 185, 230, 0.26)",
  textPrimary: "#edf4ff",
  textSecondary: "rgba(237, 244, 255, 0.76)",
  textTertiary: "rgba(237, 244, 255, 0.58)",
  link: "#a9dcff",
  linkHover: "#d8f1ff",
  buttonPrimaryBackground: "#05070b",
  buttonPrimaryText: "#ffffff",
  buttonPrimaryBorder: "rgba(255, 255, 255, 0.18)",
  buttonSecondaryBackground: "rgba(5, 7, 11, 0.94)",
  buttonSecondaryText: "#edf4ff",
  buttonSecondaryBorder: "rgba(255, 255, 255, 0.14)",
  inputBackground: "rgba(8, 12, 20, 0.94)",
  inputText: "#edf4ff",
  inputBorder: "rgba(122, 185, 230, 0.24)",
  bubbleBackground: "#0f1623",
  bubbleBorder: "rgba(122, 185, 230, 0.32)",
  bubbleText: "#edf4ff",
  shadow: "rgba(0, 0, 0, 0.34)"
} as const;

const NAVY_SURFACE_THEME = {
  surface: "rgba(12, 20, 40, 0.78)",
  surfaceStrong: "rgba(17, 29, 56, 0.96)",
  subsurface: "rgba(15, 27, 53, 0.94)",
  surfaceBorder: "rgba(139, 196, 240, 0.24)",
  textPrimary: "#eef4ff",
  textSecondary: "rgba(238, 244, 255, 0.78)",
  textTertiary: "rgba(238, 244, 255, 0.58)",
  link: "#b6dcff",
  linkHover: "#e2f2ff",
  buttonPrimaryBackground: "#8bc4f0",
  buttonPrimaryText: "#081324",
  buttonPrimaryBorder: "rgba(139, 196, 240, 0.4)",
  buttonSecondaryBackground: "rgba(16, 28, 52, 0.96)",
  buttonSecondaryText: "#dceeff",
  buttonSecondaryBorder: "rgba(139, 196, 240, 0.3)",
  inputBackground: "rgba(8, 15, 31, 0.94)",
  inputText: "#eef4ff",
  inputBorder: "rgba(139, 196, 240, 0.24)",
  bubbleBackground: "#111d38",
  bubbleBorder: "rgba(139, 196, 240, 0.32)",
  bubbleText: "#eef4ff",
  shadow: "rgba(0, 0, 0, 0.34)"
} as const;

const GREEN_SURFACE_THEME = {
  surface: "rgba(12, 28, 20, 0.78)",
  surfaceStrong: "rgba(18, 42, 29, 0.96)",
  subsurface: "rgba(18, 37, 28, 0.94)",
  surfaceBorder: "rgba(128, 199, 154, 0.24)",
  textPrimary: "#eefbf2",
  textSecondary: "rgba(238, 251, 242, 0.78)",
  textTertiary: "rgba(238, 251, 242, 0.58)",
  link: "#b6f0c2",
  linkHover: "#e0ffe7",
  buttonPrimaryBackground: "#86d8a0",
  buttonPrimaryText: "#082012",
  buttonPrimaryBorder: "rgba(134, 216, 160, 0.4)",
  buttonSecondaryBackground: "rgba(16, 34, 24, 0.96)",
  buttonSecondaryText: "#ddf9e5",
  buttonSecondaryBorder: "rgba(128, 199, 154, 0.3)",
  inputBackground: "rgba(8, 20, 14, 0.94)",
  inputText: "#eefbf2",
  inputBorder: "rgba(128, 199, 154, 0.24)",
  bubbleBackground: "#112819",
  bubbleBorder: "rgba(128, 199, 154, 0.32)",
  bubbleText: "#eefbf2",
  shadow: "rgba(0, 0, 0, 0.34)"
} as const;

const CABIN_SURFACE_THEME = {
  surface: "rgba(47, 28, 18, 0.8)",
  surfaceStrong: "rgba(65, 39, 25, 0.96)",
  subsurface: "rgba(58, 34, 22, 0.94)",
  surfaceBorder: "rgba(214, 171, 117, 0.24)",
  textPrimary: "#fff5e8",
  textSecondary: "rgba(255, 245, 232, 0.8)",
  textTertiary: "rgba(255, 245, 232, 0.58)",
  link: "#f4d19a",
  linkHover: "#ffe8c5",
  buttonPrimaryBackground: "#d9a868",
  buttonPrimaryText: "#251308",
  buttonPrimaryBorder: "rgba(217, 168, 104, 0.42)",
  buttonSecondaryBackground: "rgba(70, 42, 27, 0.96)",
  buttonSecondaryText: "#fbe6c6",
  buttonSecondaryBorder: "rgba(214, 171, 117, 0.3)",
  inputBackground: "rgba(34, 20, 13, 0.94)",
  inputText: "#fff5e8",
  inputBorder: "rgba(214, 171, 117, 0.24)",
  bubbleBackground: "#3a2316",
  bubbleBorder: "rgba(214, 171, 117, 0.32)",
  bubbleText: "#fff5e8",
  shadow: "rgba(0, 0, 0, 0.36)"
} as const;

const LIME_SURFACE_THEME = {
  surface: "rgba(251, 255, 242, 0.84)",
  surfaceStrong: "rgba(253, 255, 248, 0.98)",
  subsurface: "rgba(241, 248, 225, 0.96)",
  surfaceBorder: "rgba(132, 173, 81, 0.24)",
  textPrimary: "#213019",
  textSecondary: "rgba(33, 48, 25, 0.74)",
  textTertiary: "rgba(33, 48, 25, 0.54)",
  link: "#5d7f34",
  linkHover: "#425b21",
  buttonPrimaryBackground: "#9dca67",
  buttonPrimaryText: "#16220d",
  buttonPrimaryBorder: "rgba(157, 202, 103, 0.42)",
  buttonSecondaryBackground: "rgba(251, 255, 244, 0.96)",
  buttonSecondaryText: "#496226",
  buttonSecondaryBorder: "rgba(132, 173, 81, 0.26)",
  inputBackground: "#fdfff8",
  inputText: "#213019",
  inputBorder: "rgba(132, 173, 81, 0.24)",
  bubbleBackground: "#fafff1",
  bubbleBorder: "rgba(132, 173, 81, 0.2)",
  bubbleText: "#213019",
  shadow: "rgba(66, 91, 33, 0.12)"
} as const;

const ROSE_SURFACE_THEME = {
  surface: "rgba(255, 246, 246, 0.84)",
  surfaceStrong: "rgba(255, 251, 250, 0.98)",
  subsurface: "rgba(249, 233, 235, 0.96)",
  surfaceBorder: "rgba(191, 120, 126, 0.22)",
  textPrimary: "#3f2025",
  textSecondary: "rgba(63, 32, 37, 0.74)",
  textTertiary: "rgba(63, 32, 37, 0.54)",
  link: "#9c5360",
  linkHover: "#7a3845",
  buttonPrimaryBackground: "#d98d98",
  buttonPrimaryText: "#2a1014",
  buttonPrimaryBorder: "rgba(217, 141, 152, 0.42)",
  buttonSecondaryBackground: "rgba(255, 250, 249, 0.96)",
  buttonSecondaryText: "#7a3845",
  buttonSecondaryBorder: "rgba(191, 120, 126, 0.24)",
  inputBackground: "#fffdfc",
  inputText: "#3f2025",
  inputBorder: "rgba(191, 120, 126, 0.22)",
  bubbleBackground: "#fff6f5",
  bubbleBorder: "rgba(191, 120, 126, 0.18)",
  bubbleText: "#3f2025",
  shadow: "rgba(122, 56, 69, 0.11)"
} as const;

const POLKA_SURFACE_THEME = {
  surface: "rgba(255, 248, 251, 0.86)",
  surfaceStrong: "rgba(255, 252, 253, 0.98)",
  subsurface: "rgba(252, 236, 242, 0.96)",
  surfaceBorder: "rgba(220, 150, 177, 0.22)",
  textPrimary: "#402432",
  textSecondary: "rgba(64, 36, 50, 0.74)",
  textTertiary: "rgba(64, 36, 50, 0.54)",
  link: "#a55476",
  linkHover: "#843958",
  buttonPrimaryBackground: "#df8eb1",
  buttonPrimaryText: "#2b1220",
  buttonPrimaryBorder: "rgba(223, 142, 177, 0.42)",
  buttonSecondaryBackground: "rgba(255, 251, 252, 0.96)",
  buttonSecondaryText: "#8a4260",
  buttonSecondaryBorder: "rgba(220, 150, 177, 0.24)",
  inputBackground: "#fffdfd",
  inputText: "#402432",
  inputBorder: "rgba(220, 150, 177, 0.22)",
  bubbleBackground: "#fff7fa",
  bubbleBorder: "rgba(220, 150, 177, 0.18)",
  bubbleText: "#402432",
  shadow: "rgba(138, 66, 96, 0.11)"
} as const;

const BACKGROUND_THEME_MAP: Record<DeskCatBackground, BackgroundTheme> = {
  black: {
    ...DARK_SURFACE_THEME,
    id: "black",
    label: "Original Black",
    description: "The original DeskCat look with a dark, cozy desktop backdrop.",
    background: "linear-gradient(180deg, #06080d 0%, #101725 58%, #1a2436 100%)",
    foreground: "#edf4ff",
    accent: "#7ab9e6",
    border: "rgba(122, 185, 230, 0.34)",
    swatches: ["#05070b", "#111827", "#7ab9e6"]
  },
  default: {
    ...NAVY_SURFACE_THEME,
    id: "default",
    label: "Dark Navy",
    description: "A deep midnight-blue backdrop with a calmer, nautical glow.",
    background: "linear-gradient(180deg, #091326 0%, #122447 56%, #1d3564 100%)",
    foreground: "#eef4ff",
    accent: "#8bc4f0",
    border: "rgba(139, 196, 240, 0.34)",
    swatches: ["#091326", "#1d3564", "#8bc4f0"]
  },
  green: {
    ...GREEN_SURFACE_THEME,
    id: "green",
    label: "Forest Green",
    description: "A deep evergreen backdrop with a soft mossy glow.",
    background: "linear-gradient(180deg, #08140d 0%, #153321 56%, #28573b 100%)",
    foreground: "#eefbf2",
    accent: "#86d8a0",
    border: "rgba(128, 199, 154, 0.34)",
    swatches: ["#08140d", "#28573b", "#86d8a0"]
  },
  lime: {
    ...LIME_SURFACE_THEME,
    id: "lime",
    label: "Soft Lime",
    description: "A gentle lime wash with fresh spring greens instead of neon intensity.",
    background: "linear-gradient(180deg, #fbfff4 0%, #e4f1c5 56%, #c6df93 100%)",
    foreground: "#213019",
    accent: "#9dca67",
    border: "rgba(132, 173, 81, 0.32)",
    swatches: ["#fbfff4", "#d8ecae", "#9dca67"]
  },
  cabin: {
    ...CABIN_SURFACE_THEME,
    id: "cabin",
    label: "Cabin Brown",
    description: "Warm log-cabin browns with a lantern-lit, woodsy feel.",
    background: "linear-gradient(180deg, #1a0f0a 0%, #4a2d1b 56%, #785334 100%)",
    foreground: "#fff5e8",
    accent: "#d9a868",
    border: "rgba(214, 171, 117, 0.34)",
    swatches: ["#1a0f0a", "#785334", "#d9a868"]
  },
  lavender: {
    ...LIGHT_SURFACE_THEME,
    id: "lavender",
    label: "Light Lavender",
    description: "A quiet pastel wash for gentler writing sessions.",
    background: "linear-gradient(180deg, #f8f1ff 0%, #f0e8ff 58%, #fbf6ff 100%)",
    foreground: "#2a1f43",
    accent: "#b597f3",
    border: "rgba(181, 151, 243, 0.4)",
    swatches: ["#fdf9ff", "#e9dcff", "#b597f3"]
  },
  polka: {
    ...POLKA_SURFACE_THEME,
    id: "polka",
    label: "Polka Dot",
    description: "A soft blush backdrop with playful pink dots and a sweeter feel.",
    background:
      "radial-gradient(circle, rgba(227, 145, 180, 0.9) 0 8px, transparent 8.5px) 0 0 / 88px 88px, radial-gradient(circle, rgba(244, 190, 211, 0.92) 0 6px, transparent 6.5px) 44px 44px / 88px 88px, linear-gradient(180deg, #fffafd 0%, #ffeef5 100%)",
    foreground: "#402432",
    accent: "#df8eb1",
    border: "rgba(220, 150, 177, 0.3)",
    swatches: ["#fffafd", "#f8d6e4", "#df8eb1"]
  },
  rose: {
    ...ROSE_SURFACE_THEME,
    id: "rose",
    label: "Soft Rosebud",
    description: "A muted rosy backdrop with warm pink-red tones and a softer glow.",
    background: "linear-gradient(180deg, #fff8f7 0%, #f4d7da 56%, #e6b4bb 100%)",
    foreground: "#3f2025",
    accent: "#d98d98",
    border: "rgba(191, 120, 126, 0.32)",
    swatches: ["#fff8f7", "#efc5cb", "#d98d98"]
  },
  orange: {
    ...LIGHT_SURFACE_THEME,
    id: "orange",
    label: "Bright Orange",
    description: "A bold citrus backdrop with more energy.",
    background: "linear-gradient(180deg, #ffd89f 0%, #ffb14a 58%, #ff922f 100%)",
    foreground: "#412104",
    accent: "#ff7c22",
    border: "rgba(170, 88, 10, 0.38)",
    swatches: ["#fff2dd", "#ffb14a", "#ff7c22"]
  }
};

export const BACKGROUND_OPTIONS = [
  BACKGROUND_THEME_MAP.black,
  BACKGROUND_THEME_MAP.default,
  BACKGROUND_THEME_MAP.green,
  BACKGROUND_THEME_MAP.lime,
  BACKGROUND_THEME_MAP.cabin,
  BACKGROUND_THEME_MAP.lavender,
  BACKGROUND_THEME_MAP.polka,
  BACKGROUND_THEME_MAP.rose,
  BACKGROUND_THEME_MAP.orange
];

function normalizeBackground(value: unknown): DeskCatBackground {
  switch (value) {
    case "black":
    case "green":
    case "lime":
    case "cabin":
    case "lavender":
    case "polka":
    case "rose":
    case "orange":
    case "default":
      return value;
    default:
      return DEFAULT_APPEARANCE_SETTINGS.background;
  }
}

function normalizeCosmetic(value: unknown): DeskCatCosmeticId {
  return isDeskCatCosmeticId(value) ? value : DEFAULT_APPEARANCE_SETTINGS.cosmetic;
}

export function getBackgroundTheme(background: DeskCatBackground) {
  return BACKGROUND_THEME_MAP[background] ?? BACKGROUND_THEME_MAP.black;
}

export function loadAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APPEARANCE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE_SETTINGS;

    const parsed = JSON.parse(raw);
    return {
      background: normalizeBackground(parsed?.background),
      cosmetic: normalizeCosmetic(parsed?.cosmetic)
    };
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings) {
  if (typeof window === "undefined") return;

  const normalized: AppearanceSettings = {
    background: normalizeBackground(settings.background),
    cosmetic: normalizeCosmetic(settings.cosmetic)
  };

  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}
