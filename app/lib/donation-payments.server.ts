import "server-only";

import { desc, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "../db";
import { donationPayments, donationSettings } from "../db/schema";
import { DEFAULT_DONATION_PROGRESS } from "./donations";

const DONATION_SETTINGS_ID = "default";
const MIN_DONATION_CENTS = 100;
const MAX_DONATION_CENTS = 1_000_000;

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

async function ensureDonationSettings() {
  const defaults = DEFAULT_DONATION_PROGRESS;

  await getDb()
    .insert(donationSettings)
    .values({
      id: DONATION_SETTINGS_ID,
      title: defaults.title,
      actionLabel: defaults.actionLabel,
      currencyCode: defaults.currencyCode,
      goalAmount: Math.round(defaults.goalAmount),
      currentAmount: Math.round(defaults.currentAmount),
      currentAmountCents: Math.round(defaults.currentAmount * 100),
      rewards: defaults.rewards,
      updatedAt: new Date()
    })
    .onConflictDoNothing();
}

export async function recordPaidDonation(
  session: Stripe.Checkout.Session,
  stripeEventId?: string
) {
  if (session.metadata?.purpose !== "deskcat_donation") {
    return { recorded: false, reason: "unrecognized_session" as const };
  }

  if (session.payment_status !== "paid") {
    return { recorded: false, reason: "payment_not_complete" as const };
  }

  const amountCents = session.amount_total;
  const currencyCode = session.currency?.toUpperCase();

  if (
    amountCents === null ||
    amountCents < MIN_DONATION_CENTS ||
    amountCents > MAX_DONATION_CENTS ||
    !currencyCode
  ) {
    throw new Error(`Stripe Checkout Session ${session.id} has invalid donation details.`);
  }

  await ensureDonationSettings();

  const result = await getDb().execute(sql`
    WITH inserted AS (
      INSERT INTO ${donationPayments} (
        ${sql.identifier("checkout_session_id")},
        ${sql.identifier("payment_intent_id")},
        ${sql.identifier("stripe_event_id")},
        ${sql.identifier("amount_cents")},
        ${sql.identifier("currency_code")}
      )
      VALUES (
        ${session.id},
        ${getPaymentIntentId(session)},
        ${stripeEventId ?? null},
        ${amountCents},
        ${currencyCode}
      )
      ON CONFLICT (${sql.identifier("checkout_session_id")}) DO NOTHING
      RETURNING ${sql.identifier("amount_cents")}
    ),
    updated AS (
      UPDATE ${donationSettings}
      SET
        ${sql.identifier("current_amount_cents")} =
          ${donationSettings.currentAmountCents} +
          (SELECT ${sql.identifier("amount_cents")} FROM inserted),
        ${sql.identifier("current_amount")} =
          FLOOR((
            ${donationSettings.currentAmountCents} +
            (SELECT ${sql.identifier("amount_cents")} FROM inserted)
          ) / 100.0)::integer,
        ${sql.identifier("updated_at")} = NOW()
      WHERE
        ${donationSettings.id} = ${DONATION_SETTINGS_ID}
        AND EXISTS (SELECT 1 FROM inserted)
      RETURNING ${sql.identifier("current_amount_cents")}
    )
    SELECT
      EXISTS (SELECT 1 FROM inserted) AS recorded,
      (SELECT ${sql.identifier("current_amount_cents")} FROM updated) AS current_amount_cents
  `);

  const row = result.rows[0] as
    | { recorded?: boolean; current_amount_cents?: number | string | null }
    | undefined;

  return {
    recorded: row?.recorded === true,
    currentAmount:
      row?.current_amount_cents === null || row?.current_amount_cents === undefined
        ? null
        : Number(row.current_amount_cents) / 100
  };
}

export async function loadRecentDonations(limit = 50) {
  return getDb()
    .select({
      checkoutSessionId: donationPayments.checkoutSessionId,
      amountCents: donationPayments.amountCents,
      currencyCode: donationPayments.currencyCode,
      receivedAt: donationPayments.receivedAt
    })
    .from(donationPayments)
    .orderBy(desc(donationPayments.receivedAt))
    .limit(Math.max(1, Math.min(limit, 100)));
}
