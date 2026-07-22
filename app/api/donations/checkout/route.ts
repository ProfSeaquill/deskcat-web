import { NextResponse } from "next/server";
import { loadDonationProgress } from "@/app/lib/donations.server";
import { getStripe } from "@/app/lib/stripe.server";

const MIN_DONATION_CENTS = 100;
const MAX_DONATION_CENTS = 1_000_000;

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { amount?: unknown };
    const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
    const amountInCents = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      amountInCents < MIN_DONATION_CENTS ||
      amountInCents > MAX_DONATION_CENTS
    ) {
      return NextResponse.json(
        { error: "Enter a donation between $1 and $10,000." },
        { status: 400 }
      );
    }

    const donationProgress = await loadDonationProgress();
    const baseUrl = getBaseUrl(request);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      line_items: [
        {
          price_data: {
            currency: donationProgress.currencyCode.toLowerCase(),
            product_data: {
              name: donationProgress.title,
              description: "A one-time donation to support DeskCat."
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],
      metadata: {
        purpose: "deskcat_donation"
      },
      payment_intent_data: {
        metadata: {
          purpose: "deskcat_donation"
        }
      },
      success_url: `${baseUrl}/?donation=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?donation=cancelled`
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe Checkout Session", error);
    const isConfigurationError =
      error instanceof Error && error.message.includes("STRIPE_SECRET_KEY");

    return NextResponse.json(
      {
        error: isConfigurationError
          ? "Donations are not configured yet."
          : "Stripe Checkout is temporarily unavailable. Please try again."
      },
      { status: 500 }
    );
  }
}
