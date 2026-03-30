export type DeskCatBackground =
  | "black"
  | "default"
  | "green"
  | "cabin"
  | "zebra"
  | "lavender"
  | "orange";

export type AppearanceSettings = {
  background: DeskCatBackground;
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
  background: "black"
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

const ZEBRA_SURFACE_THEME = {
  surface: "rgba(255, 250, 242, 0.84)",
  surfaceStrong: "rgba(255, 253, 248, 0.98)",
  subsurface: "rgba(245, 238, 226, 0.96)",
  surfaceBorder: "rgba(26, 26, 26, 0.16)",
  textPrimary: "#19150f",
  textSecondary: "rgba(25, 21, 15, 0.74)",
  textTertiary: "rgba(25, 21, 15, 0.54)",
  link: "#243f5f",
  linkHover: "#14273c",
  buttonPrimaryBackground: "#111111",
  buttonPrimaryText: "#fff9ef",
  buttonPrimaryBorder: "rgba(17, 17, 17, 0.18)",
  buttonSecondaryBackground: "rgba(255, 252, 247, 0.96)",
  buttonSecondaryText: "#1f1913",
  buttonSecondaryBorder: "rgba(26, 26, 26, 0.14)",
  inputBackground: "#fffdf8",
  inputText: "#19150f",
  inputBorder: "rgba(26, 26, 26, 0.16)",
  bubbleBackground: "#fff8ee",
  bubbleBorder: "rgba(26, 26, 26, 0.12)",
  bubbleText: "#19150f",
  shadow: "rgba(17, 17, 17, 0.12)"
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
  zebra: {
    ...ZEBRA_SURFACE_THEME,
    id: "zebra",
    label: "Zebra Print",
    description: "Black-and-ivory stripes for a louder, fashion-forward desktop.",
    background:
      "radial-gradient(circle at top, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 42%), repeating-linear-gradient(115deg, #131313 0 18px, #faf3e8 18px 44px, #252525 44px 63px, #ece3d4 63px 96px)",
    foreground: "#19150f",
    accent: "#111111",
    border: "rgba(26, 26, 26, 0.24)",
    swatches: ["#131313", "#faf3e8", "#243f5f"]
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
  BACKGROUND_THEME_MAP.cabin,
  BACKGROUND_THEME_MAP.zebra,
  BACKGROUND_THEME_MAP.lavender,
  BACKGROUND_THEME_MAP.orange
];

function normalizeBackground(value: unknown): DeskCatBackground {
  switch (value) {
    case "black":
    case "green":
    case "cabin":
    case "zebra":
    case "lavender":
    case "orange":
    case "default":
      return value;
    default:
      return DEFAULT_APPEARANCE_SETTINGS.background;
  }
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
      background: normalizeBackground(parsed?.background)
    };
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings) {
  if (typeof window === "undefined") return;

  const normalized: AppearanceSettings = {
    background: normalizeBackground(settings.background)
  };

  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}
