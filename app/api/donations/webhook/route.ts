import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { recordPaidDonation } from "@/app/lib/donation-payments.server";
import { getStripe } from "@/app/lib/stripe.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Unable to verify Stripe webhook signature", error);
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await recordPaidDonation(event.data.object, event.id);
    return NextResponse.json({ received: true, recorded: result.recorded });
  } catch (error) {
    console.error("Unable to record completed Stripe donation", error);
    return NextResponse.json({ error: "Unable to record donation." }, { status: 500 });
  }
}
