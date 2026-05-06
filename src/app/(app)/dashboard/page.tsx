"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { TxHash } from "@/components/tx-hash";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/toast";

interface Payout {
  id: string;
  amount_usd: number;
  status: string;
  solana_tx_sig: string | null;
  dodo_payment_id: string | null;
  bulk_payout_id: string | null;
  created_at: string;
  contractor_id: string;
  contractors: {
    name: string;
    solana_wallet: string;
    owner_id: string;
  };
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[var(--text-muted)]">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const payout = searchParams.get("payout");
    if (payout === "success") {
      toast("Payment initiated! Waiting for confirmation...", "success");
    } else if (payout === "bulk") {
      toast("Bulk payout initiated! Sending USDC to all contractors...", "success");
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

  async function handleExportCSV() {
    setExporting(true);
    const res = await fetch("/api/payouts/export");
    if (res.status === 404) {
      toast("No payouts to export yet", "error");
      setExporting(false);
      return;
    }
    if (!res.ok) {
      toast("Export failed", "error");
      setExporting(false);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashpay-payouts-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setExporting(false);
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

  const now = new Date();

  const totalPaid = payouts
    .filter((p) => p.status === "done")
    .reduce((sum, p) => sum + Number(p.amount_usd), 0);

  // This month vs last month for paid amount
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthPaid = payouts
    .filter((p) => p.status === "done" && new Date(p.created_at) >= thisMonthStart)
    .reduce((s, p) => s + Number(p.amount_usd), 0);
  const lastMonthPaid = payouts
    .filter((p) => p.status === "done" && new Date(p.created_at) >= lastMonthStart && new Date(p.created_at) < thisMonthStart)
    .reduce((s, p) => s + Number(p.amount_usd), 0);
  const paidTrendPct = lastMonthPaid > 0 ? Math.round(((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100) : null;

  const contractorCount = contractors.length;
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newContractorsThisWeek = contractors.filter((c) => new Date(c.created_at) > oneWeekAgo).length;

  const thisMonth = payouts.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const lastMonthCount = payouts.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === lastMonthStart.getMonth() && d.getFullYear() === lastMonthStart.getFullYear();
  }).length;
  const monthDiff = thisMonth - lastMonthCount;
  const prevMonthName = lastMonthStart.toLocaleString("default", { month: "long" });

  return (
    <div className="animate-fade-in relative z-[1]">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 stagger-children">
        {/* Total Paid Out */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              Total Paid Out
            </span>
            <div className="w-7 h-7 rounded-lg bg-[var(--green-dim)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-mono-data font-semibold text-[var(--green)] leading-none">
            ${totalPaid.toFixed(2)}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[var(--text-muted)]">all time</p>
            {paidTrendPct !== null && (
              <span className="flex items-center gap-0.5 text-[11px] font-mono-data text-[var(--green)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
                {paidTrendPct > 0 ? "+" : ""}{paidTrendPct}%
              </span>
            )}
          </div>
        </div>

        {/* Active Contractors */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              Active Contractors
            </span>
            <div className="w-7 h-7 rounded-lg bg-[var(--green-dim)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-mono-data font-semibold text-[var(--text-primary)] leading-none">
            {contractorCount}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[var(--text-muted)]">registered wallets</p>
            {newContractorsThisWeek > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-mono-data text-[var(--green)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
                +{newContractorsThisWeek} this week
              </span>
            )}
          </div>
        </div>

        {/* This Month */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium">
              This Month
            </span>
            <div className="w-7 h-7 rounded-lg bg-[var(--green-dim)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-mono-data font-semibold text-[var(--text-primary)] leading-none">
            {thisMonth}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-[var(--text-muted)]">payouts</p>
            <span className={`flex items-center gap-0.5 text-[11px] font-mono-data ${monthDiff >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {monthDiff >= 0
                  ? <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
                  : <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>
                }
              </svg>
              {monthDiff >= 0 ? "+" : ""}{monthDiff} vs {prevMonthName}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="card overflow-hidden flex flex-col" style={{ minHeight: "calc(100vh - 340px)" }}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between">
            <div>
              <h2 className="font-heading font-semibold text-sm text-[var(--text-primary)]">
                Recent Payouts
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Latest transactions on Solana</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
                style={{ border: "1px solid var(--border-bright)", color: "var(--text-muted)", background: "transparent" }}
                onMouseEnter={(e) => { if (!exporting) { (e.currentTarget as HTMLElement).style.color = "var(--green)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--green)"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-bright)"; }}
              >
                {exporting ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
              <Link href="/payouts" className="text-xs text-[var(--green)] hover:underline flex items-center gap-1">
                View all
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)] text-sm flex-1 flex items-center justify-center">
              Loading...
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-60">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm text-[var(--text-muted)] mb-2">No payouts yet.</p>
              <Link href="/contractors" className="text-sm text-[var(--green)] hover:underline">
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
                  {payouts.map((p) => {
                    const name = p.contractors?.name || "";
                    const initials = name ? getInitials(name) : "?";
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
                            >
                              <span className="text-[10px] font-bold" style={{ color: "var(--bg-base)" }}>{initials}</span>
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">{name || "—"}</span>
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
