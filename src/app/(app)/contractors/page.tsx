"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/browser";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
  created_at: string;
}

interface Invite {
  id: string;
  token: string;
  company_name: string | null;
  invite_url?: string;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function truncateWallet(w: string) {
  if (w.length <= 12) return w;
  return `${w.slice(0, 6)}...${w.slice(-6)}`;
}

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [totalPaidMap, setTotalPaidMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [formError, setFormError] = useState("");

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCompanyName, setInviteCompanyName] = useState("");
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchContractors();
    fetchPayouts();
  }, []);

  // Realtime subscription for new contractors
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("contractors-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contractors" },
        (payload) => {
          const incoming = payload.new as Contractor;
          setContractors((prev) => {
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchContractors() {
    const res = await fetch("/api/contractors");
    if (res.ok) setContractors(await res.json());
    setLoading(false);
  }

  async function fetchPayouts() {
    const res = await fetch("/api/payouts");
    if (res.ok) {
      const payouts = await res.json();
      const map: Record<string, number> = {};
      for (const p of payouts) {
        if (p.status === "done") {
          map[p.contractor_id] = (map[p.contractor_id] || 0) + Number(p.amount_usd);
        }
      }
      setTotalPaidMap(map);
    }
  }

  function openInviteModal() {
    setShowInviteModal(true);
    setGeneratedInvite(null);
    setInviteCompanyName("");
    setCopied(false);
  }

  async function handleGenerateInvite() {
    setInviteGenerating(true);
    setGeneratedInvite(null);
    const res = await fetch("/api/invites/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: inviteCompanyName }),
    });
    const data = await res.json();
    if (res.ok && data.invite) {
      const appUrl = window.location.origin;
      setGeneratedInvite({ ...data.invite, invite_url: `${appUrl}/invite/${data.invite.token}` });
      setCopied(false);
    } else {
      toast(data.error || "Failed to generate invite", "error");
    }
    setInviteGenerating(false);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      setName(""); setEmail(""); setWallet(""); setShowForm(false);
      fetchContractors();
    } else {
      const data = await res.json();
      setFormError(data.error || "Failed to add contractor");
    }
    setSubmitting(false);
  }

  const filtered = contractors.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in relative z-[1]">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
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
            className="w-full pl-9 pr-3 py-2 text-sm input-base"
          />
        </div>

        <button
          onClick={openInviteModal}
          className="px-4 py-2 text-sm flex items-center gap-1.5 rounded-lg font-medium transition-colors"
          style={{ border: "1px solid var(--green)", color: "var(--green)", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--green-dim)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Invite Contractor
        </button>

        <button
          onClick={() => { setShowForm(!showForm); if (!showForm) window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className={`px-4 py-2 text-sm flex items-center gap-1.5 ${showForm ? "btn-secondary" : "btn-primary"}`}
        >
          {!showForm && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
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
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="w-full px-3 py-2.5 text-sm input-base" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="w-full px-3 py-2.5 text-sm input-base" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">Solana Wallet Address *</label>
              <input required value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Enter base58 Solana address" className="w-full px-3 py-2.5 text-sm font-mono-data input-base" />
            </div>
            {formError && <p className="text-sm text-[var(--red)]">{formError}</p>}
            <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm btn-primary">
              {submitting ? "Adding..." : "Add Contractor"}
            </button>
          </form>
        </div>
      )}

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-[var(--text-muted)]">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map((c) => {
            const initials = getInitials(c.name);
            const totalPaid = totalPaidMap[c.id] || 0;
            return (
              <div key={c.id} className="card flex flex-col overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
                  >
                    <span className="text-sm font-bold" style={{ color: "var(--bg-base)" }}>{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{c.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" />
                      </svg>
                      <span className="text-xs text-[var(--text-muted)] truncate">{c.email || "No email"}</span>
                    </div>
                  </div>
                  <button className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between border-t border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Wallet
                  </div>
                  <span className="font-mono-data text-xs text-[var(--text-secondary)]">
                    {truncateWallet(c.solana_wallet)}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--text-muted)]">Total paid</span>
                  <span className="font-mono-data text-sm font-semibold text-[var(--green)]">
                    ${totalPaid.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 border-t border-[var(--border)]">
                  <Link
                    href={`/pay/${c.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-sm rounded-lg font-medium transition-colors"
                    style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green-border)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--green)";
                      (e.currentTarget as HTMLElement).style.color = "var(--bg-base)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--green-dim)";
                      (e.currentTarget as HTMLElement).style.color = "var(--green)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Pay
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Ghost card */}
          <button
            onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="min-h-[210px] rounded-xl flex flex-col items-center justify-center gap-3 transition-all group"
            style={{ border: "1.5px dashed var(--border-bright)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--green)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-bright)"; }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[var(--green)] transition-colors">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--green)] transition-colors">
              Add Contractor
            </span>
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="card w-full max-w-lg flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header — never scrolls away */}
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-heading font-semibold text-base text-[var(--text-primary)]">Invite a Contractor</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Share a link — they fill in their own details</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto">
              {/* Company name field */}
              <div>
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5 font-medium">
                  Your Company Name <span className="normal-case">(optional — shown to contractor)</span>
                </label>
                <input
                  type="text"
                  value={inviteCompanyName}
                  onChange={(e) => setInviteCompanyName(e.target.value)}
                  placeholder="e.g. Acme Inc."
                  className="w-full px-3 py-2.5 text-sm input-base"
                />
              </div>

              <button
                onClick={handleGenerateInvite}
                disabled={inviteGenerating}
                className="w-full py-3 text-sm btn-primary"
              >
                {inviteGenerating ? "Generating..." : "Generate Invite Link"}
              </button>

              {/* Generated link */}
              {generatedInvite?.invite_url && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--bg-base)", border: "1px solid var(--green-border)" }}>
                    <span className="flex-1 text-xs font-mono-data text-[var(--green)] truncate">
                      {generatedInvite.invite_url}
                    </span>
                    <button
                      onClick={() => handleCopy(generatedInvite.invite_url!)}
                      className="flex-shrink-0 px-3 py-1.5 text-xs rounded-md font-medium transition-colors"
                      style={{ background: copied ? "var(--green)" : "var(--green-dim)", color: copied ? "var(--bg-base)" : "var(--green)" }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Expires in 15 minutes · Can only be used once
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
