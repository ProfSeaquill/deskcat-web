import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { adminAuditLogs, featureFlags } from "../db/schema";

export const CONSTRUCTION_SCREEN_FLAG = "construction_screen";

const DEFAULT_CONSTRUCTION_SCREEN_ENABLED = true;

export async function isConstructionScreenEnabled() {
  try {
    const [flag] = await getDb()
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.id, CONSTRUCTION_SCREEN_FLAG))
      .limit(1);

    return flag?.enabled ?? DEFAULT_CONSTRUCTION_SCREEN_ENABLED;
  } catch {
    return DEFAULT_CONSTRUCTION_SCREEN_ENABLED;
  }
}

export async function setConstructionScreenEnabled(enabled: boolean, actorEmail: string) {
  const db = getDb();

  await db
    .insert(featureFlags)
    .values({
      id: CONSTRUCTION_SCREEN_FLAG,
      enabled,
      description: "Controls whether the public homepage shows the construction screen.",
      updatedByEmail: actorEmail,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: featureFlags.id,
      set: {
        enabled,
        updatedByEmail: actorEmail,
        updatedAt: new Date()
      }
    });

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: enabled ? "construction_screen.activate" : "construction_screen.deactivate",
    targetType: "feature_flag",
    targetId: CONSTRUCTION_SCREEN_FLAG,
    metadata: { enabled }
  });
}
