"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/toast";

interface RecentPayout {
  amount_usd: number;
  created_at: string;
  contractors: { name: string } | null;
}

interface TreasuryInfo {
  balance: number;
  available: number;
  pendingSum: number;
  pendingCount: number;
  avgPayout: number;
  runwayCount: number | null;
  walletAddress: string;
  fullAddress: string;
  cluster: string;
  rpcError: boolean;
  tier: "healthy" | "low" | "critical" | "insufficient";
  thresholds: { low: number; critical: number };
  isOwner: boolean;
  ownerEmail: string | null;
  recentPayouts: RecentPayout[];
}

const tierConfig = {
  healthy: {
    label: "Healthy",
    color: "var(--green)",
    bg: "var(--green-dim)",
    border: "var(--green-border)",
    icon: "✓",
    message: "Treasury has sufficient runway.",
  },
  low: {
    label: "Low balance",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    icon: "⚠",
    message: "Balance is below the recommended threshold. Consider topping up.",
  },
  critical: {
    label: "Critical",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    icon: "🚨",
    message: "Balance is critically low. Top up immediately to avoid failed payouts.",
  },
  insufficient: {
    label: "Insufficient",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    icon: "🚨",
    message: "Balance cannot cover pending payouts. Top up immediately.",
  },
};

export default function TreasuryPage() {
  const [info, setInfo] = useState<TreasuryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/treasury/info");
      if (res.status === 401) {
        const next = encodeURIComponent("/treasury");
        router.replace(`/login?next=${next}`);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      } else {
        setError(`Server returned ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-[var(--text-muted)]">Loading treasury...</div>;
  }
  if (error || !info) {
    return (
      <div className="max-w-md mx-auto mt-20 card p-6 text-center">
        <p className="text-sm text-[var(--text-primary)] font-medium mb-1">Couldn&apos;t load treasury</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">{error || "Try refreshing or sign in again."}</p>
        <button onClick={load} className="px-4 py-2 text-xs rounded-lg font-semibold btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const tier = tierConfig[info.tier];

  return (
    <div className="animate-fade-in relative z-[1] max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Treasury</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Solana hot wallet · {info.cluster}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors"
            style={{ border: "1px solid var(--border-bright)", color: "var(--text-muted)" }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={refreshing ? "animate-spin" : ""}
            >
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3" />
            </svg>
            Refresh
          </button>
          {info.isOwner ? (
            <a
              href={`https://faucet.solana.com/?cluster=${info.cluster}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs rounded-lg font-semibold btn-primary"
            >
              + Refill Treasury
            </a>
          ) : (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 text-xs rounded-lg font-semibold btn-primary"
            >
              Request Refill
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div
        className="card p-4 mb-5 flex items-start gap-3"
        style={{
          borderLeft: `3px solid ${tier.color}`,
          background: tier.bg,
        }}
      >
        <span className="text-xl flex-shrink-0">{tier.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: tier.color }}>
            {tier.label}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{tier.message}</p>
        </div>
        {!info.isOwner && info.tier !== "healthy" && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="text-xs font-semibold whitespace-nowrap px-3 py-1.5 rounded-md"
            style={{ background: tier.color, color: "var(--on-green)" }}
          >
            Request refill →
          </button>
        )}
      </div>

      {/* Top metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <MetricCard
          label="Total balance"
          value={`$${info.balance.toFixed(2)}`}
          unit="USDC"
          accent={tier.color}
          highlight
        />
        <MetricCard
          label="Available"
          value={`$${info.available.toFixed(2)}`}
          sub={`$${info.pendingSum.toFixed(2)} reserved`}
        />
        <MetricCard
          label="Pending payouts"
          value={String(info.pendingCount)}
          sub={info.pendingCount > 0 ? `$${info.pendingSum.toFixed(2)} locked` : "None in flight"}
        />
        <MetricCard
          label="Runway"
          value={info.runwayCount !== null ? `~${info.runwayCount}` : "—"}
          sub={info.avgPayout > 0 ? `payouts at avg $${info.avgPayout.toFixed(2)}` : "no history yet"}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Wallet details */}
        <div className="card p-6">
          <h2 className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium mb-4">
            Wallet details
          </h2>
          <div className="space-y-3">
            <Row label="Address" value={info.walletAddress} mono />
            <Row label="Network" value={`Solana ${info.cluster}`} />
            <Row label="Token" value="USDC (SPL)" />
            <Row
              label="Owner"
              value={info.isOwner ? "You" : info.ownerEmail || "—"}
              accent={info.isOwner ? "var(--green)" : undefined}
            />
            <Row
              label="Low threshold"
              value={`$${info.thresholds.low.toFixed(0)}`}
              sub="amber alert"
            />
            <Row
              label="Critical threshold"
              value={`$${info.thresholds.critical.toFixed(0)}`}
              sub="red alert"
            />
          </div>
          <div className="pt-4 mt-4 border-t border-[var(--border)]">
            <a
              href={`https://solscan.io/address/${info.fullAddress}?cluster=${info.cluster}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium flex items-center gap-1.5"
              style={{ color: "var(--green)" }}
            >
              View on Solscan
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <h2 className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium mb-4">
            Recent outflows
          </h2>
          {info.recentPayouts.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No payouts yet.</p>
          ) : (
            <div className="space-y-3">
              {info.recentPayouts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {p.contractors?.name || "Unknown"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">{formatDate(p.created_at)}</p>
                  </div>
                  <span className="font-mono-data text-sm" style={{ color: "var(--green)" }}>
                    −${Number(p.amount_usd).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showRequestModal && (
        <RequestRefillModal
          balance={info.balance}
          tier={info.tier}
          ownerEmail={info.ownerEmail}
          onClose={() => setShowRequestModal(false)}
          onSent={() => {
            setShowRequestModal(false);
            toast("Refill request sent to treasury owner", "success");
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  sub,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-[10px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium mb-2">
        {label}
      </p>
      <p
        className="font-mono-data leading-none"
        style={{
          color: accent || "var(--text-primary)",
          fontSize: highlight ? "26px" : "20px",
          fontWeight: 600,
        }}
      >
        {value}
        {unit && (
          <span className="text-[12px] font-medium ml-1.5" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-muted)] mt-2">{sub}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  mono,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="text-right">
        <p
          className={`text-sm ${mono ? "font-mono-data" : ""}`}
          style={{ color: accent || "var(--text-primary)" }}
        >
          {value}
        </p>
        {sub && <p className="text-[10px] text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  );
}

function RequestRefillModal({
  balance,
  tier,
  ownerEmail,
  onClose,
  onSent,
}: {
  balance: number;
  tier: "healthy" | "low" | "critical" | "insufficient";
  ownerEmail: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const suggested = Math.max(500, Math.ceil((1000 - balance) / 100) * 100);
  const [amount, setAmount] = useState(suggested);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const urgency =
    tier === "critical" || tier === "insufficient"
      ? "critical"
      : tier === "low"
      ? "urgent"
      : "normal";

  async function send() {
    if (!amount || amount <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    setSending(true);
    const res = await fetch("/api/treasury/request-refill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, balance, note, urgency }),
    });
    if (res.ok) {
      onSent();
    } else {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Failed to send request", "error");
    }
    setSending(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-heading font-bold text-[var(--text-primary)]">Request Treasury Refill</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          An email will be sent to {ownerEmail || "the treasury owner"}.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium block mb-1.5">
              Current balance
            </label>
            <p className="font-mono-data text-[var(--text-primary)]">${balance.toFixed(2)} USDC</p>
          </div>

          <div>
            <label className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium block mb-1.5">
              Requested amount (USDC)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              max={1000000}
              className="w-full px-3 py-2 text-sm input-base font-mono-data"
            />
          </div>

          <div>
            <label className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)] font-medium block mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="e.g. We have 12 pending payouts this week"
              rows={3}
              className="w-full px-3 py-2 text-sm input-base resize-none"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{note.length}/500</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-xs rounded-lg font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="px-4 py-2 text-xs rounded-lg font-semibold btn-primary disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
