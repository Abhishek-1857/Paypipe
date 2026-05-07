import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AccountLayout } from "@solana/spl-token";
import bs58 from "bs58";

// Same mint used by lib/solana.ts
const USDC_MINT = new PublicKey("XBouzXTNYLEqmVG8P3EHhvTHLWzMD84hNmoZYktihcS");
const USDC_DECIMALS = 6;

export async function GET() {
  try {
    const key = process.env.SOLANA_HOT_WALLET_KEY;
    if (!key) {
      return NextResponse.json({ balance: null, error: "Wallet not configured" });
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(key));
    const fullAddress = wallet.publicKey.toBase58();
    const walletAddress = `${fullAddress.slice(0, 6)}...${fullAddress.slice(-6)}`;

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const cluster = rpcUrl.includes("mainnet") ? "mainnet-beta" : "devnet";
    const connection = new Connection(rpcUrl, "confirmed");

    const { value: tokenAccounts } = await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      { mint: USDC_MINT }
    );

    let balance = 0;
    if (tokenAccounts.length > 0) {
      const accountData = AccountLayout.decode(tokenAccounts[0].account.data);
      balance = Number(accountData.amount) / 10 ** USDC_DECIMALS;
    }

    return NextResponse.json({ balance, walletAddress, fullAddress, cluster });
  } catch (err) {
    console.error("[wallet/balance]", err);
    return NextResponse.json({ balance: null, error: "RPC unavailable" });
  }
}
