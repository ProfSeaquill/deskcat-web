import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const EDITOR_SESSION_COOKIE = "deskcat_anchor_editor_session";
const EDITOR_SESSION_MESSAGE = "deskcat-anchor-editor";

export { EDITOR_SESSION_COOKIE };

export function isDeskCatAnchorEditorEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.DESKCAT_ANCHOR_EDITOR_ENABLED === "true";
}

export function canWriteDeskCatAnchors(authorization: string | null) {
  if (process.env.NODE_ENV !== "production") return true;

  const configuredToken = process.env.DESKCAT_ANCHOR_EDITOR_TOKEN;
  const suppliedToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  return isDeskCatAnchorEditorTokenValid(suppliedToken, configuredToken);
}

export function createDeskCatAnchorEditorSessionValue(token: string) {
  return createHmac("sha256", token).update(EDITOR_SESSION_MESSAGE).digest("hex");
}

export function isDeskCatAnchorEditorSessionValid(sessionValue: string | undefined) {
  if (process.env.NODE_ENV !== "production") return true;

  const configuredToken = process.env.DESKCAT_ANCHOR_EDITOR_TOKEN;
  if (!configuredToken || !sessionValue) return false;

  return timingSafeStringEqual(sessionValue, createDeskCatAnchorEditorSessionValue(configuredToken));
}

export function isDeskCatAnchorEditorTokenValid(token: string, configuredToken = process.env.DESKCAT_ANCHOR_EDITOR_TOKEN) {
  if (!configuredToken || !token) return false;

  return timingSafeStringEqual(token, configuredToken);
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
