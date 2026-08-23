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
  DESKCAT_ANCHOR_DATA,
  validateDeskCatAnchorDocument,
  type DeskCatAnchorDocument
} from "../lib/deskcatAnchors";

type AnchorResponse = {
  document: DeskCatAnchorDocument;
  revision: string;
};

type DeskCatAnchorContextValue = AnchorResponse & {
  refresh: () => Promise<void>;
};

const DeskCatAnchorContext = createContext<DeskCatAnchorContextValue>({
  document: DESKCAT_ANCHOR_DATA,
  revision: "bundled",
  refresh: async () => undefined
});

function isAnchorResponse(value: unknown): value is AnchorResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnchorResponse>;
  return (
    typeof candidate.revision === "string" &&
    validateDeskCatAnchorDocument(candidate.document).length === 0
  );
}

export default function DeskCatAnchorProvider({ children }: { children: ReactNode }) {
  const [anchors, setAnchors] = useState<AnchorResponse>({
    document: DESKCAT_ANCHOR_DATA,
    revision: "bundled"
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/appearance/anchors", { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok || !isAnchorResponse(result)) return;
      setAnchors((current) => (current.revision === result.revision ? current : result));
    } catch {
      // Keep the bundled or last-known-good anchors if the database is unavailable.
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(() => void refresh(), 60_000);
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ ...anchors, refresh }),
    [anchors, refresh]
  );

  return (
    <DeskCatAnchorContext.Provider value={value}>
      {children}
    </DeskCatAnchorContext.Provider>
  );
}

export function useDeskCatAnchors() {
  return useContext(DeskCatAnchorContext);
}
