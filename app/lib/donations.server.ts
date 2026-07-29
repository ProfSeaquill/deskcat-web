import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { adminAuditLogs, donationSettings } from "../db/schema";
import {
  DEFAULT_DONATION_PROGRESS,
  buildDonationProgress,
  type DonationProgressSource,
  type DonationReward
} from "./donations";
import { isDeskCatCosmeticId } from "./deskcatSprite";

const DONATION_PROGRESS_PATH = path.join(process.cwd(), "app", "data", "donationProgress.json");
const DONATION_SETTINGS_ID = "default";

export async function loadDonationProgress() {
  try {
    const [settings] = await getDb()
      .select()
      .from(donationSettings)
      .where(eq(donationSettings.id, DONATION_SETTINGS_ID))
      .limit(1);

    if (settings) {
      return buildDonationProgress({
        title: settings.title,
        actionLabel: settings.actionLabel,
        currencyCode: settings.currencyCode,
        goalAmount: settings.goalAmount,
        currentAmount: settings.currentAmount,
        rewards: settings.rewards.map((reward) => ({
          label: reward.label,
          amount: reward.amount,
          highlight: reward.highlight,
          cosmeticId: isDeskCatCosmeticId(reward.cosmeticId) ? reward.cosmeticId : undefined
        }))
      });
    }
  } catch {
    // Fall through to the checked-in fallback JSON when the database is unavailable.
  }

  try {
    const raw = await readFile(DONATION_PROGRESS_PATH, "utf8");
    return buildDonationProgress(JSON.parse(raw) as Partial<DonationProgressSource>);
  } catch {
    return DEFAULT_DONATION_PROGRESS;
  }
}

export async function saveDonationProgress(
  input: DonationProgressSource,
  actorEmail: string
) {
  const snapshot = buildDonationProgress(input);
  const rewards: DonationReward[] = snapshot.rewards.map((reward) => ({
    label: reward.label,
    amount: reward.amount,
    highlight: reward.highlight === true,
    cosmeticId: reward.cosmeticId
  }));
  const db = getDb();

  await db
    .insert(donationSettings)
    .values({
      id: DONATION_SETTINGS_ID,
      title: snapshot.title,
      actionLabel: snapshot.actionLabel,
      currencyCode: snapshot.currencyCode,
      goalAmount: Math.round(snapshot.goalAmount),
      currentAmount: Math.round(snapshot.currentAmount),
      rewards,
      updatedByEmail: actorEmail,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: donationSettings.id,
      set: {
        title: snapshot.title,
        actionLabel: snapshot.actionLabel,
        currencyCode: snapshot.currencyCode,
        goalAmount: Math.round(snapshot.goalAmount),
        currentAmount: Math.round(snapshot.currentAmount),
        rewards,
        updatedByEmail: actorEmail,
        updatedAt: new Date()
      }
    });

  await db.insert(adminAuditLogs).values({
    actorEmail,
    action: "donation_progress.update",
    targetType: "donation_settings",
    targetId: DONATION_SETTINGS_ID,
    metadata: {
      title: snapshot.title,
      goalAmount: snapshot.goalAmount,
      currentAmount: snapshot.currentAmount,
      rewards
    }
  });

  return snapshot;
}
