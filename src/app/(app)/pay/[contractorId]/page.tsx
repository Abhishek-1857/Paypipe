"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { WalletAddress } from "@/components/wallet-address";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function PayPage({
  params,
}: {
  params: { contractorId: string };
}) {
  const { contractorId } = params;
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((data: Contractor[]) => {
        setContractor(data.find((c) => c.id === contractorId) || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contractorId]);

  async function handlePay() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1 || amountNum > 10) {
      toast("Amount must be between $1 and $10", "error");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, amountUsd: amountNum }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast(data.error || "Failed to create checkout", "error");
        setPaying(false);
      }
    } catch {
      toast("Network error", "error");
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">Loading...</div>;
  }

  if (!contractor) {
    return <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">Contractor not found.</div>;
  }

  const initials = getInitials(contractor.name);

  return (
    <div className="max-w-[440px] mx-auto animate-fade-in relative z-[1]">
      {/* Contractor Info */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
        >
          <span className="text-sm font-bold" style={{ color: "var(--bg-base)" }}>{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{contractor.name}</p>
          <WalletAddress address={contractor.solana_wallet} />
        </div>
      </div>

      {/* Payment Card */}
      <div className="card p-6">
        {/* Big amount input */}
        <div className="py-6 text-center border-b border-[var(--border)] mb-5">
          <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Amount (USD)
          </label>
          <div className="inline-flex items-center">
            <span className="text-[var(--text-muted)] font-mono-data text-5xl mr-1">$</span>
            <input
              type="number"
              min="1"
              max="10"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-36 text-5xl font-mono-data text-[var(--green)] bg-transparent border-none outline-none text-center placeholder:text-[var(--border-bright)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          {amount && parseFloat(amount) > 0 && (
            <p className="text-sm text-[var(--text-muted)] mt-2 font-mono-data animate-fade-in">
              ≈ {parseFloat(amount).toFixed(2)} USDC on Solana
            </p>
          )}
        </div>

        {/* Fee breakdown */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Solana network fee</span>
            <span className="font-mono-data">~$0.001</span>
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>Settlement time</span>
            <span className="font-mono-data">&lt;2 seconds</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={paying || !amount}
          className="w-full py-3 text-sm btn-primary"
        >
          {paying ? "Redirecting to checkout..." : "Pay via Card"}
        </button>

        <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
          Min $1 · Max $10 · Settled as USDC on Solana
        </p>
      </div>
    </div>
  );
}
