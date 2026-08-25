import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { adminAuditLogs, featureFlags } from "../db/schema";

export const CONSTRUCTION_SCREEN_FLAG = "construction_screen";
export const DONATION_METER_FLAG = "donation_meter";

const DEFAULT_CONSTRUCTION_SCREEN_ENABLED = true;
const DEFAULT_DONATION_METER_ENABLED = true;

async function readFlag(id: string, fallback: boolean) {
  try {
    const [flag] = await getDb()
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .limit(1);

    return flag?.enabled ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeFlag(options: {
  id: string;
  enabled: boolean;
  description: string;
  actorEmail: string;
  action: string;
}) {
  const db = getDb();
  const updatedAt = new Date();

  await db
    .insert(featureFlags)
    .values({
      id: options.id,
      enabled: options.enabled,
      description: options.description,
      updatedByEmail: options.actorEmail,
      updatedAt
    })
    .onConflictDoUpdate({
      target: featureFlags.id,
      set: {
        enabled: options.enabled,
        updatedByEmail: options.actorEmail,
        updatedAt
      }
    });

  await db.insert(adminAuditLogs).values({
    actorEmail: options.actorEmail,
    action: options.action,
    targetType: "feature_flag",
    targetId: options.id,
    metadata: { enabled: options.enabled }
  });
}

export async function isConstructionScreenEnabled() {
  return readFlag(CONSTRUCTION_SCREEN_FLAG, DEFAULT_CONSTRUCTION_SCREEN_ENABLED);
}

export async function setConstructionScreenEnabled(enabled: boolean, actorEmail: string) {
  await writeFlag({
    id: CONSTRUCTION_SCREEN_FLAG,
    enabled,
    description: "Controls whether the public homepage shows the construction screen.",
    actorEmail,
    action: enabled ? "construction_screen.activate" : "construction_screen.deactivate"
  });
}

export async function isDonationMeterEnabled() {
  return readFlag(DONATION_METER_FLAG, DEFAULT_DONATION_METER_ENABLED);
}

export async function setDonationMeterEnabled(enabled: boolean, actorEmail: string) {
  await writeFlag({
    id: DONATION_METER_FLAG,
    enabled,
    description: "Controls whether the public homepage shows the donation meter.",
    actorEmail,
    action: enabled ? "donation_meter.show" : "donation_meter.hide"
  });
}
