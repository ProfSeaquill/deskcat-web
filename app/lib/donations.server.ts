import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_DONATION_PROGRESS,
  buildDonationProgress,
  type DonationProgressSource
} from "./donations";

const DONATION_PROGRESS_PATH = path.join(process.cwd(), "app", "data", "donationProgress.json");

export async function loadDonationProgress() {
  try {
    const raw = await readFile(DONATION_PROGRESS_PATH, "utf8");
    return buildDonationProgress(JSON.parse(raw) as Partial<DonationProgressSource>);
  } catch {
    return DEFAULT_DONATION_PROGRESS;
  }
}
