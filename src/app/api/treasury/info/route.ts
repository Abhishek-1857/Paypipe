import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AccountLayout } from "@solana/spl-token";
import bs58 from "bs58";
import { createClient } from "@/lib/supabase/server";

const USDC_MINT = new PublicKey("XBouzXTNYLEqmVG8P3EHhvTHLWzMD84hNmoZYktihcS");
const USDC_DECIMALS = 6;

function getThresholds() {
  return {
    low: Number(process.env.TREASURY_LOW_THRESHOLD_USD ?? 500),
    critical: Number(process.env.TREASURY_CRITICAL_THRESHOLD_USD ?? 100),
  };
}

function getTier(balance: number, pending: number, low: number, critical: number) {
  if (balance < pending) return "insufficient";
  if (balance < critical) return "critical";
  if (balance < low) return "low";
  return "healthy";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerEmail = (process.env.TREASURY_OWNER_EMAIL || "").toLowerCase();
  const isOwner = ownerEmail ? user.email?.toLowerCase() === ownerEmail : true;

  const key = process.env.SOLANA_HOT_WALLET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Wallet not configured" }, { status: 500 });
  }

  let balance = 0;
  let walletAddress = "";
  let fullAddress = "";
  let cluster: "devnet" | "mainnet-beta" = "devnet";
  let rpcError = false;

  try {
    const wallet = Keypair.fromSecretKey(bs58.decode(key));
    fullAddress = wallet.publicKey.toBase58();
    walletAddress = `${fullAddress.slice(0, 6)}...${fullAddress.slice(-6)}`;

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    cluster = rpcUrl.includes("mainnet") ? "mainnet-beta" : "devnet";
    const connection = new Connection(rpcUrl, "confirmed");

    const { value: tokenAccounts } = await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      { mint: USDC_MINT }
    );

    if (tokenAccounts.length > 0) {
      const accountData = AccountLayout.decode(tokenAccounts[0].account.data);
      balance = Number(accountData.amount) / 10 ** USDC_DECIMALS;
    }
  } catch (err) {
    console.error("[treasury/info] RPC error", err);
    rpcError = true;
  }

  const { data: pendingPayouts } = await supabase
    .from("payouts")
    .select("amount_usd")
    .in("status", ["pending", "processing"]);

  const pendingSum =
    pendingPayouts?.reduce((s, p) => s + Number(p.amount_usd), 0) ?? 0;
  const pendingCount = pendingPayouts?.length ?? 0;

  const { data: doneRecent } = await supabase
    .from("payouts")
    .select("amount_usd")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(50);

  const avgPayout =
    doneRecent && doneRecent.length > 0
      ? doneRecent.reduce((s, p) => s + Number(p.amount_usd), 0) / doneRecent.length
      : 0;

  const available = Math.max(0, balance - pendingSum);
  const runwayCount = avgPayout > 0 ? Math.floor(available / avgPayout) : null;

  const { data: lastDone } = await supabase
    .from("payouts")
    .select("created_at, amount_usd, contractors(name)")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(5);

  const { low, critical } = getThresholds();
  const tier = getTier(balance, pendingSum, low, critical);

  return NextResponse.json({
    balance,
    available,
    pendingSum,
    pendingCount,
    avgPayout,
    runwayCount,
    walletAddress,
    fullAddress,
    cluster,
    rpcError,
    tier,
    thresholds: { low, critical },
    isOwner,
    ownerEmail: isOwner ? ownerEmail : maskEmail(ownerEmail),
    recentPayouts: lastDone ?? [],
  });
}

function maskEmail(email: string) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return null;
  const masked = name.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}
