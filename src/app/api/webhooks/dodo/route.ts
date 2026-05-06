import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createServiceClient } from "@/lib/supabase/server";
import { sendUsdc } from "@/lib/solana";
import { sendPayoutEmails } from "@/lib/emails";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    const wh = new Webhook(process.env.DODO_WEBHOOK_KEY!);
    wh.verify(body, headers);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.type !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  const payment = event.data;
  const metadata = payment.metadata || {};
  const contractorId = metadata.contractor_id;
  const amountUsd = parseFloat(metadata.amount_usd);
  const ownerId = metadata.owner_id;
  const paymentId = payment.payment_id;

  if (!contractorId || !amountUsd || !paymentId) {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("payouts")
    .select("id")
    .eq("dodo_payment_id", paymentId)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const { data: payout, error: insertError } = await supabase
    .from("payouts")
    .insert({
      contractor_id: contractorId,
      amount_usd: amountUsd,
      dodo_payment_id: paymentId,
      status: "processing",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert payout:", insertError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("solana_wallet, name, email")
    .eq("id", contractorId)
    .single();

  if (!contractor) {
    await supabase
      .from("payouts")
      .update({ status: "failed", error_message: "Contractor not found" })
      .eq("id", payout.id);
    return NextResponse.json({ error: "Contractor not found" }, { status: 400 });
  }

  let txSig: string | null = null;

  try {
    txSig = await sendUsdc(contractor.solana_wallet, amountUsd);
    await supabase
      .from("payouts")
      .update({ status: "done", solana_tx_sig: txSig })
      .eq("id", payout.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("payouts")
      .update({ status: "failed", error_message: message })
      .eq("id", payout.id);
    return NextResponse.json({ received: true });
  }

  // Send confirmation emails — fire and forget, never blocks the response
  if (txSig) {
    let founderEmail = payment.customer?.email as string | undefined;

    // Fall back to looking up by owner_id if not in payment object
    if (!founderEmail && ownerId) {
      const { data: user } = await supabase.auth.admin.getUserById(ownerId);
      founderEmail = user?.user?.email;
    }

    if (founderEmail) {
      sendPayoutEmails({
        contractorName: contractor.name,
        contractorEmail: contractor.email ?? null,
        founderEmail,
        amountUsd,
        solanaSignature: txSig,
        cluster: "devnet",
      }).then(async () => {
        await supabase
          .from("payouts")
          .update({ emails_sent: true })
          .eq("id", payout.id);
      });
    }
  }

  return NextResponse.json({ received: true });
}
