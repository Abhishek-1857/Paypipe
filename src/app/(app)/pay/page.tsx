"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
}

interface Payout {
  contractor_id: string;
  amount_usd: number;
  status: string;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function truncateWallet(w: string) {
  return `${w.slice(0, 4)}...${w.slice(-4)}`;
}

export default function SendPaymentPage() {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [totalPaidMap, setTotalPaidMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/contractors").then((r) => r.json()),
      fetch("/api/payouts").then((r) => r.json()),
    ]).then(([cs, ps]) => {
      setContractors(cs);
      const map: Record<string, number> = {};
      for (const p of ps as Payout[]) {
        if (p.status === "done") {
          map[p.contractor_id] = (map[p.contractor_id] || 0) + Number(p.amount_usd);
        }
      }
      setTotalPaidMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = contractors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(id: string) {
    router.push(`/pay/${id}`);
  }

  return (
    <div className="animate-fade-in relative z-[1] max-w-2xl">
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Choose who you&apos;re paying. You&apos;ll set the amount on the next step.
      </p>

      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2"
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search contractors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm input-base"
        />
      </div>

      {/* Contractor list */}
      {loading ? (
        <div className="py-20 text-center text-[var(--text-muted)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-[var(--text-muted)] mb-2">
            {search ? "No contractors match your search." : "No contractors yet."}
          </p>
          {!search && (
            <button
              onClick={() => router.push("/contractors")}
              className="text-sm text-[var(--green)] hover:underline"
            >
              Add a contractor first →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const initials = getInitials(c.name);
            const totalPaid = totalPaidMap[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="w-full card p-4 flex items-center gap-4 text-left hover:border-[var(--green-border)] hover:bg-[var(--bg-elevated)] transition-all group"
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
                >
                  <span className="text-sm font-bold" style={{ color: "var(--bg-base)" }}>
                    {initials}
                  </span>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {c.email || truncateWallet(c.solana_wallet)}
                  </p>
                </div>

                {/* Total paid */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Total paid</p>
                  <p className="font-mono-data text-sm font-semibold text-[var(--green)]">
                    ${totalPaid.toFixed(2)}
                  </p>
                </div>

                {/* Arrow */}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 group-hover:stroke-[var(--green)] group-hover:translate-x-0.5 transition-all"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
