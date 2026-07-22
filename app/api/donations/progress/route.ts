import { NextResponse } from "next/server";
import { loadDonationProgress } from "@/app/lib/donations.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const progress = await loadDonationProgress();

  return NextResponse.json(progress, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
