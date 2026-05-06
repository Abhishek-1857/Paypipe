"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { WalletAddress } from "@/components/wallet-address";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
  created_at: string;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [formError, setFormError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchContractors();
  }, []);

  async function fetchContractors() {
    const res = await fetch("/api/contractors");
    if (res.ok) setContractors(await res.json());
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(wallet)) {
      setFormError("Invalid Solana wallet address");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || null, solana_wallet: wallet }),
    });

    if (res.ok) {
      toast("Contractor added", "success");
      setName("");
      setEmail("");
      setWallet("");
      setShowForm(false);
      fetchContractors();
    } else {
      const data = await res.json();
      setFormError(data.error || "Failed to add contractor");
    }
    setSubmitting(false);
  }

  return (
    <div className="animate-fade-in relative z-[1]">
      <div className="flex items-center justify-between mb-6">
        <div />
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 text-sm ${showForm ? "btn-secondary" : "btn-primary"}`}
        >
          {showForm ? "Cancel" : "Add Contractor"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-6 mb-6 animate-fade-in">
          <h2 className="font-heading font-semibold text-sm mb-4">New Contractor</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 text-sm input-base"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2.5 text-sm input-base"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                Solana Wallet Address *
              </label>
              <input
                required
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Enter base58 Solana address"
                className="w-full px-3 py-2.5 text-sm font-mono-data input-base"
              />
            </div>
            {formError && (
              <p className="text-sm text-[var(--red)]">{formError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm btn-primary"
            >
              {submitting ? "Adding..." : "Add Contractor"}
            </button>
          </form>
        </div>
      )}

      {/* Contractor Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-[var(--text-muted)]">Loading...</div>
      ) : contractors.length === 0 && !showForm ? (
        <div className="py-20 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-60">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <p className="text-sm text-[var(--text-muted)] mb-2">No contractors yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[var(--green)] hover:underline"
          >
            Add your first contractor →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {contractors.map((c) => (
            <div
              key={c.id}
              className="p-5 flex flex-col rounded-[10px] card"
            >
              <div className="flex-1 mb-5">
                <h3 className="font-heading font-semibold text-[16px] text-[var(--text-primary)] mb-1">
                  {c.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  {c.email || "No email"}
                </p>
                <WalletAddress address={c.solana_wallet} />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <Link
                  href={`/pay/${c.id}`}
                  className="px-5 py-2 text-xs btn-outline-green"
                >
                  Pay
                </Link>
              </div>
            </div>
          ))}

          {/* Add contractor card */}
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[10px] p-5 flex flex-col items-center justify-center gap-2 min-h-[180px] transition-colors"
            style={{
              border: "1.5px dashed var(--border-bright)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--green)";
              e.currentTarget.querySelector("svg")!.setAttribute("stroke", "var(--green)");
              e.currentTarget.querySelector("span")!.style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-bright)";
              e.currentTarget.querySelector("svg")!.setAttribute("stroke", "var(--text-muted)");
              e.currentTarget.querySelector("span")!.style.color = "var(--text-muted)";
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 150ms" }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-xs text-[var(--text-muted)]" style={{ transition: "color 150ms" }}>Add Contractor</span>
          </button>
        </div>
      )}
    </div>
  );
}
