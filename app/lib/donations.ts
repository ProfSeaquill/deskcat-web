import donationProgressData from "../data/donationProgress.json";
import { isDeskCatCosmeticId, type DeskCatCosmeticId } from "./deskcatSprite";

export type DonationReward = {
  label: string;
  amount: number;
  highlight?: boolean;
  cosmeticId?: DeskCatCosmeticId;
};

export type DonationProgressSource = {
  title: string;
  actionLabel: string;
  currencyCode: string;
  goalAmount: number;
  currentAmount: number;
  rewards: DonationReward[];
};

export type DonationProgressSnapshot = DonationProgressSource & {
  currentPercent: number;
  remainingAmount: number;
};

const DEFAULT_DONATION_PROGRESS_SOURCE = donationProgressData as DonationProgressSource;

function clampAmount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeRewards(
  rewards: DonationProgressSource["rewards"] | undefined,
  fallback: DonationProgressSource["rewards"]
) {
  const next = rewards?.filter(
    (reward) =>
      typeof reward?.label === "string" &&
      reward.label.length > 0 &&
      Number.isFinite(reward.amount)
  );

  if (!next || next.length === 0) {
    return fallback;
  }

  return [...next]
    .map((reward) => ({
      label: reward.label,
      amount: clampAmount(reward.amount),
      highlight: reward.highlight === true,
      cosmeticId: isDeskCatCosmeticId(reward.cosmeticId) ? reward.cosmeticId : undefined
    }))
    .sort((a, b) => a.amount - b.amount);
}

export function buildDonationProgress(
  raw: Partial<DonationProgressSource> | null | undefined
): DonationProgressSnapshot {
  const goalAmount =
    typeof raw?.goalAmount === "number" && raw.goalAmount > 0
      ? raw.goalAmount
      : DEFAULT_DONATION_PROGRESS_SOURCE.goalAmount;
  const currentAmount = clampAmount(
    typeof raw?.currentAmount === "number"
      ? raw.currentAmount
      : DEFAULT_DONATION_PROGRESS_SOURCE.currentAmount
  );

  return {
    title:
      typeof raw?.title === "string" && raw.title.length > 0
        ? raw.title
        : DEFAULT_DONATION_PROGRESS_SOURCE.title,
    actionLabel:
      typeof raw?.actionLabel === "string" && raw.actionLabel.length > 0
        ? raw.actionLabel
        : DEFAULT_DONATION_PROGRESS_SOURCE.actionLabel,
    currencyCode:
      typeof raw?.currencyCode === "string" && raw.currencyCode.length > 0
        ? raw.currencyCode
        : DEFAULT_DONATION_PROGRESS_SOURCE.currencyCode,
    goalAmount,
    currentAmount,
    rewards: normalizeRewards(raw?.rewards, DEFAULT_DONATION_PROGRESS_SOURCE.rewards),
    currentPercent: clampPercent((currentAmount / goalAmount) * 100),
    remainingAmount: Math.max(goalAmount - currentAmount, 0)
  };
}

export const DEFAULT_DONATION_PROGRESS = buildDonationProgress(
  DEFAULT_DONATION_PROGRESS_SOURCE
);
