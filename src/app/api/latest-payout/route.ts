import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("payouts")
    .select("amount_usd, solana_tx_sig, created_at, contractors(name, solana_wallet)")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return NextResponse.json(null);
  }

  const contractor = data.contractors as unknown as { solana_wallet: string; name: string } | null;
  const wallet = contractor?.solana_wallet || "";
  const name = contractor?.name || "";

  return NextResponse.json({
    amount_usd: data.amount_usd,
    tx_sig: data.solana_tx_sig,
    wallet_short: wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : null,
    contractor_name: name,
    created_at: data.created_at,
  });
}
