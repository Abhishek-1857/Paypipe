"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { AmountDisplay } from "@/components/amount-display";
import { TxHash } from "@/components/tx-hash";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/toast";

interface Payout {
  id: string;
  amount_usd: number;
  status: string;
  solana_tx_sig: string | null;
  dodo_payment_id: string | null;
  created_at: string;
  contractor_id: string;
  contractors: {
    name: string;
    solana_wallet: string;
    owner_id: string;
  };
}

interface Contractor {
  id: string;
  name: string;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-[var(--text-muted)]">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickPaying, setQuickPaying] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payout") === "success") {
      toast("Payment initiated! Waiting for confirmation...", "success");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    fetchPayouts();
    fetchContractors();
  }, []);

  async function fetchPayouts() {
    const res = await fetch("/api/payouts");
    if (res.ok) setPayouts(await res.json());
    setLoading(false);
  }

  async function fetchContractors() {
    const res = await fetch("/api/contractors");
    if (res.ok) setContractors(await res.json());
  }

  async function handleRetry(payoutId: string) {
    setRetrying(payoutId);
    const res = await fetch(`/api/payout/${payoutId}/retry`, { method: "POST" });
    if (res.ok) {
      toast("Payout retried successfully!", "success");
    } else {
      const data = await res.json();
      toast(data.error || "Retry failed", "error");
    }
    setRetrying(null);
    fetchPayouts();
  }

  async function handleQuickPay() {
    if (!selectedContractor || !quickAmount) return;
    const amount = parseFloat(quickAmount);
    if (amount < 1 || amount > 10) {
      toast("Amount must be between $1 and $10", "error");
      return;
    }
    setQuickPaying(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId: selectedContractor, amountUsd: amount }),
    });
    const data = await res.json();
    if (res.ok && data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      toast(data.error || "Failed to create checkout", "error");
      setQuickPaying(false);
    }
  }

  const totalPaid = payouts
    .filter((p) => p.status === "done")
    .reduce((sum, p) => sum + Number(p.amount_usd), 0);

  const contractorCount = new Set(
    payouts.map((p) => p.contractors?.name).filter(Boolean)
  ).size;

  const thisMonth = payouts.filter((p) => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="animate-fade-in relative z-[1]">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 stagger-children">
        <div className="stat-card p-5" style={{ borderBottom: "2px solid var(--green)" }}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              Total Paid Out
            </span>
            <span className="text-lg">💸</span>
          </div>
          <AmountDisplay amount={totalPaid} size="xl" />
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">all time</p>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              Active Contractors
            </span>
            <span className="text-lg">👥</span>
          </div>
          <p className="text-[32px] font-mono-data font-semibold text-[var(--text-primary)] leading-none">
            {contractorCount}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">registered wallets</p>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              This Month
            </span>
            <span className="text-lg">📅</span>
          </div>
          <p className="text-[32px] font-mono-data font-semibold text-[var(--text-primary)] leading-none">
            {thisMonth}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">payouts</p>
        </div>
      </div>

      {/* Main content: Table + Send Payout */}
      <div className="flex gap-4" style={{ minHeight: "calc(100vh - 320px)" }}>
        {/* Payouts Table */}
        <div className="card flex-1 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
              Recent Payouts
            </h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)] text-sm flex-1 flex items-center justify-center">
              Loading...
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-60">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-[var(--text-muted)] mb-2">No payouts yet.</p>
              <Link
                href="/contractors"
                className="text-sm text-[var(--green)] hover:underline"
              >
                Send your first payment →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-left font-medium">Contractor</th>
                    <th className="px-5 py-3 text-left font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Tx Hash</th>
                    <th className="px-5 py-3 text-left font-medium">Time</th>
                    <th className="px-5 py-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">
                        {p.contractors?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono-data text-[var(--green)]">
                          ${Number(p.amount_usd).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {p.solana_tx_sig ? (
                          <TxHash hash={p.solana_tx_sig} />
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-muted)] text-xs">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.status === "failed" && (
                          <button
                            onClick={() => handleRetry(p.id)}
                            disabled={retrying === p.id}
                            className="text-xs text-[var(--amber)] hover:text-[var(--green)] font-medium disabled:opacity-50 transition-colors"
                          >
                            {retrying === p.id ? "Retrying..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Send a Payout Panel */}
        <div
          className="w-[320px] self-start hidden lg:block rounded-[10px] p-5 card"
        >
          <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)] mb-5">
            Send a Payout
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                Contractor
              </label>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="w-full px-3 py-2.5 text-sm input-base appearance-none"
              >
                <option value="">Select contractor</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono-data text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.01"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 text-sm font-mono-data input-base input-lg"
                />
              </div>
            </div>
            <button
              onClick={handleQuickPay}
              disabled={quickPaying || !selectedContractor || !quickAmount}
              className="w-full py-3 text-sm btn-primary"
            >
              {quickPaying ? "Redirecting..." : "Pay Now"}
            </button>
            <p className="text-[10px] text-[var(--text-muted)] text-center flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-50">
                <circle cx="12" cy="12" r="10" stroke="#00D97E" strokeWidth="1.5"/>
                <path d="M8 12l3 3 5-5" stroke="#00D97E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Settles on Solana in {"<"}2s · Fee ~$0.001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
