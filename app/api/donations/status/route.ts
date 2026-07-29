import { NextResponse } from "next/server";
import { recordPaidDonation } from "@/app/lib/donation-payments.server";
import { getStripe } from "@/app/lib/stripe.server";

export const dynamic = "force-dynamic";

const CHECKOUT_SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9_]+$/;

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId || !CHECKOUT_SESSION_ID.test(sessionId) || sessionId.length > 255) {
    return NextResponse.json({ error: "Invalid Checkout Session." }, { status: 400 });
  }

  let session;

  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Unable to retrieve Stripe Checkout Session", error);
    return NextResponse.json(
      { error: "Unable to verify this donation." },
      { status: 500 }
    );
  }

  if (session.metadata?.purpose !== "deskcat_donation") {
    return NextResponse.json({ error: "Invalid Checkout Session." }, { status: 404 });
  }

  if (session.payment_status === "paid") {
    try {
      await recordPaidDonation(session);
      return NextResponse.json(
        { status: "complete" },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      console.error("Unable to sync paid Stripe Checkout Session", error);
      return NextResponse.json(
        { status: "processing" },
        {
          status: 202,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }
  }

  return NextResponse.json(
    { status: session.status === "complete" ? "processing" : "open" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
