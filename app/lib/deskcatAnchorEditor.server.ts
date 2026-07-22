import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isDeskCatAnchorEditorEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DESKCAT_ANCHOR_EDITOR_ENABLED === "true";
}

export function canWriteDeskCatAnchors(authorization: string | null) {
  if (process.env.NODE_ENV !== "production") return true;

  const configuredToken = process.env.DESKCAT_ANCHOR_EDITOR_TOKEN;
  const suppliedToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!configuredToken || !suppliedToken) return false;

  const configured = Buffer.from(configuredToken);
  const supplied = Buffer.from(suppliedToken);
  return configured.length === supplied.length && timingSafeEqual(configured, supplied);
}
