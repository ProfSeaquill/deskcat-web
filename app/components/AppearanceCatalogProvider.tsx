"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  EMPTY_APPEARANCE_CATALOG,
  type AppearanceCatalog
} from "../lib/appearanceCatalog";

type AppearanceCatalogContextValue = {
  catalog: AppearanceCatalog;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AppearanceCatalogContext = createContext<AppearanceCatalogContextValue>({
  catalog: EMPTY_APPEARANCE_CATALOG,
  isLoading: true,
  error: null,
  refresh: async () => undefined
});

function isCatalog(value: unknown): value is AppearanceCatalog {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppearanceCatalog>;
  return (
    typeof candidate.revision === "string" &&
    Array.isArray(candidate.cosmetics) &&
    Array.isArray(candidate.backgrounds)
  );
}

export default function AppearanceCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<AppearanceCatalog>(EMPTY_APPEARANCE_CATALOG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/appearance/catalog", { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok || !isCatalog(result)) {
        throw new Error("Could not load appearance options.");
      }
      setCatalog((current) => (current.revision === result.revision ? current : result));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load appearance options.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 60_000);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ catalog, isLoading, error, refresh }),
    [catalog, isLoading, error, refresh]
  );

  return (
    <AppearanceCatalogContext.Provider value={value}>
      {children}
    </AppearanceCatalogContext.Provider>
  );
}

export function useAppearanceCatalog() {
  return useContext(AppearanceCatalogContext);
}
