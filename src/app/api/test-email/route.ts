import { NextResponse } from "next/server";
import { sendPayoutEmails } from "@/lib/emails";

export async function GET() {
  await sendPayoutEmails({
    contractorName: "Priya Sharma",
    contractorEmail: "test@example.com", // ← change to your real email
    founderEmail: "founder@flashpay.com",
    amountUsd: 500,
    solanaSignature: "4uQeVj5tqViQh7yWWGStvkEG1Adjs9UtsZrXEqbgHs3B5dCaHmERn5bFjTD6P7kD",
    cluster: "devnet",
  });

  return NextResponse.json({ ok: true, message: "Test emails sent — check your inbox." });
}
