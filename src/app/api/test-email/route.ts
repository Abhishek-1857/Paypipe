import { NextRequest, NextResponse } from "next/server";
import { sendPayoutEmails } from "@/lib/emails";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Pass ?email=you@example.com to receive the test emails." },
      { status: 400 }
    );
  }

  await sendPayoutEmails({
    contractorName: "Priya Sharma",
    contractorEmail: email,
    founderEmail: email,
    amountUsd: 500,
    solanaSignature: "4uQeVj5tqViQh7yWWGStvkEG1Adjs9UtsZrXEqbgHs3B5dCaHmERn5bFjTD6P7kD",
    cluster: "devnet",
  });

  return NextResponse.json({ ok: true, message: `Test emails sent to ${email}` });
}
