"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

interface Payout {
  id: string;
  amount_usd: number;
  status: string;
  solana_tx_sig: string | null;
  bulk_payout_id: string | null;
  created_at: string;
  contractor_id: string;
  contractors: { name: string; solana_wallet: string; owner_id: string };
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/payouts")
      .then((r) => r.json())
      .then((data) => { setPayouts(data); setLoading(false); });
  }, []);

  const filtered = payouts.filter((p) =>
    (p.contractors?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalDone = payouts
    .filter((p) => p.status === "done")
    .reduce((s, p) => s + Number(p.amount_usd), 0);

  return (
    <div className="animate-fade-in relative z-[1]">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by contractor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm input-base"
          />
        </div>
        <div className="ml-auto text-sm text-[var(--text-muted)]">
          <span className="font-mono-data text-[var(--green)] font-semibold">${totalDone.toFixed(2)}</span>
          <span className="ml-1">total paid out</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">{search ? "No payouts match your search." : "No payouts yet."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left font-medium">Contractor</th>
                <th className="px-5 py-3 text-left font-medium">Amount</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Date</th>
                <th className="px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const name = p.contractors?.name || "Unknown";
                const initials = getInitials(name);
                return (
                  <tr
                    key={p.id}
                    className="table-row cursor-pointer"
                    onClick={() => router.push(`/payouts/${p.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: "var(--bg-base)" }}>{initials}</span>
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono-data text-[var(--green)]">
                      ${Number(p.amount_usd).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)] text-xs hidden md:table-cell">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
