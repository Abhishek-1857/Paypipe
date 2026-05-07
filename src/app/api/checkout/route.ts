import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/dodo";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractorId, amountUsd } = await request.json();

  if (!contractorId || !amountUsd || amountUsd < 1 || amountUsd > 10) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("id", contractorId)
    .single();

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const serviceClient = createServiceClient();
  const { data: payout, error: payoutError } = await serviceClient
    .from("payouts")
    .insert({ contractor_id: contractorId, amount_usd: amountUsd, status: "processing" })
    .select()
    .single();

  if (payoutError || !payout) {
    console.error("Failed to pre-insert payout:", payoutError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  try {
    const session = await createCheckoutSession(
      contractorId,
      amountUsd,
      user.email!,
      user.id,
      payout.id
    );

    return NextResponse.json({ checkout_url: session.checkout_url });
  } catch (err) {
    // Clean up the pre-inserted row if checkout creation fails
    await serviceClient.from("payouts").delete().eq("id", payout.id);
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
