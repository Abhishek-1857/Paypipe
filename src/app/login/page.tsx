"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { FlashPayLogo, FlashPayWordmark } from "@/components/logo";

interface LatestPayout {
  amount_usd: number;
  tx_sig: string | null;
  wallet_short: string | null;
  contractor_name: string;
  created_at: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [latestPayout, setLatestPayout] = useState<LatestPayout | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/latest-payout")
      .then((r) => r.json())
      .then((data) => { if (data) setLatestPayout(data); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  const payoutAmt = latestPayout ? Number(latestPayout.amount_usd).toFixed(2) : "—";

  return (
    <div className="min-h-screen landing-grid-bg text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FlashPayLogo size={36} />
            <FlashPayWordmark className="text-lg" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#login" className="hover:text-white transition-colors">Sign in</a>
          </div>
          <a href="#login" className="px-4 py-2 text-sm glass rounded-lg border-[var(--border)] hover:border-[var(--border-bright)] transition-colors flex items-center gap-1 text-[var(--text-secondary)] hover:text-white">
            Sign in
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="relative z-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-mono-data text-[var(--text-muted)] mb-6 ${mounted ? 'animate-slide-up' : 'opacity-0'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]" />
              </span>
              LIVE ON SOLANA DEVNET
            </div>

            <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight leading-[1.05] mb-6">
              <span className={`block ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '80ms' }}>
                Pay anyone,
              </span>
              <span className={`block text-gradient ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '160ms' }}>
                anywhere on earth.
              </span>
            </h1>

            <p className={`text-lg text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '240ms' }}>
              Card payments in, USDC out. Settle global contractor payouts on Solana in under 2 seconds — at near-zero cost.
            </p>

            <div className={`flex flex-wrap gap-3 mb-12 ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '320ms' }}>
              <a href="#login" className="px-6 py-3 text-sm btn-primary inline-flex items-center gap-2 group">
                Start payouts
                <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="#how-it-works" className="px-6 py-3 text-sm glass rounded-lg hover:border-[var(--border-bright)] transition-colors inline-flex items-center gap-2">
                Watch demo
              </a>
            </div>

            {/* Stats with left border accent */}
            <div className={`grid grid-cols-3 gap-6 max-w-md ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
              {[
                { val: "$0.001", label: "avg. transfer fee" },
                { val: "400ms", label: "Solana finality" },
                { val: "220+", label: "countries" },
              ].map((s) => (
                <div key={s.label} className="border-l-2 border-[var(--green-border)] pl-3">
                  <div className="text-2xl font-bold font-mono-data">{s.val}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Orbit visualization */}
          <div className={`relative h-[500px] hidden lg:flex items-center justify-center ${mounted ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
            {/* Orbit center — all rings, logo, and icons are positioned relative to this */}
            <div className="relative" style={{ width: 0, height: 0 }}>
              {/* Rotating rings */}
              {[180, 280, 380].map((size, i) => (
                <div
                  key={size}
                  className="absolute rounded-full"
                  style={{
                    width: size,
                    height: size,
                    top: -size / 2,
                    left: -size / 2,
                    border: '1px solid rgba(0,217,126,0.15)',
                    animation: `ring-opacity 4s ease-in-out ${i * 0.5}s infinite`,
                  }}
                />
              ))}

              {/* Center logo with glow pulse */}
              <div
                className="absolute"
                style={{ top: -56, left: -56 }}
              >
                <FlashPayLogo size={112} animate />
              </div>

              {/* 4 Orbiting icons — transform-origin trick from reference */}
              {[
                { delay: 0, distance: 90, duration: 15, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
                { delay: -5, distance: 140, duration: 20, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
                { delay: -10, distance: 190, duration: 25, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/></svg> },
                { delay: -15, distance: 140, duration: 22, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
              ].map((item, i) => (
                <div
                  key={i}
                  className="absolute orbit-spinner"
                  style={{
                    transformOrigin: `${item.distance + 24}px 24px`,
                    left: -item.distance - 24,
                    top: -24,
                    animationDuration: `${item.duration}s`,
                    animationDelay: `${item.delay}s`,
                  }}
                >
                  <div
                    className="orbit-icon-inner glass shadow-glow"
                    style={{
                      animationDuration: `${item.duration}s`,
                      animationDelay: `${item.delay}s`,
                    }}
                  >
                    {item.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating payout card — top right */}
            <div className="absolute top-8 right-0 animate-float-y glass rounded-2xl p-3 shadow-card">
              <div className="text-[10px] font-mono-data text-[var(--text-muted)]">PAYOUT · SOLANA</div>
              <div className="text-lg font-bold text-[var(--green)]">+{payoutAmt} USDC</div>
              <div className="text-[10px] text-[var(--text-muted)]">to {latestPayout?.wallet_short || "—"} · {"<"}2s</div>
            </div>

            {/* Floating card info — bottom left */}
            <div className="absolute bottom-12 left-0 animate-float-y-alt glass rounded-2xl p-3 shadow-card" style={{ animationDelay: '1s' }}>
              <div className="text-[10px] font-mono-data text-[var(--text-muted)]">CARD · VISA</div>
              <div className="text-lg font-bold">${payoutAmt}</div>
              <div className="text-[10px] text-[var(--green)] font-medium">Settled instantly</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div className="border-y border-[rgba(255,255,255,0.05)] py-8 overflow-hidden" style={{ background: 'rgba(11,15,25,0.3)' }}>
        <div className="flex items-center gap-16">
          <div className="flex gap-16 shrink-0 items-center animate-marquee">
            {[...Array(2)].map((_, set) => (
              <div key={set} className="flex gap-16 items-center">
                {["SOLANA", "USDC", "CIRCLE", "VISA", "MASTERCARD", "STRIPE", "JUPITER", "PHANTOM"].map((name) => (
                  <span key={`${set}-${name}`} className="font-mono-data text-2xl font-bold text-[var(--text-muted)] opacity-40 hover:text-[var(--green)] transition-colors whitespace-nowrap">{name}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="font-mono-data text-xs text-[var(--green)] mb-3">{"// WHY FLASHPAY"}</div>
            <h2 className="font-heading font-bold text-4xl md:text-5xl mb-4 tracking-tight">
              Built for the <span className="text-gradient italic">speed of money</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-lg">
              A payment rail engineered for the next decade. Programmable, global, and frictionless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: "⚡", title: "Instant Settlement", desc: "Sub-2 second finality on Solana. No multi-day ACH delays.", stat: "<2s" },
              { icon: "🔒", title: "End-to-End Encrypted", desc: "Bank-grade security with non-custodial wallet integration.", stat: "256-bit" },
              { icon: "🌍", title: "Global Reach", desc: "Pay contractors in 220+ countries with zero FX friction.", stat: "220+" },
              { icon: "🔑", title: "Self-Custody Ready", desc: "Recipients keep their keys. Connect Phantom, Solflare, Backpack.", stat: "Non-custodial" },
              { icon: "⚙️", title: "Programmable Payouts", desc: "Schedule, batch, stream — automate payroll with smart contracts.", stat: "API-first" },
              { icon: "📋", title: "Compliance Built-In", desc: "KYB, AML, and tax reporting handled out of the box.", stat: "SOC 2" },
            ].map((f) => (
              <div key={f.title} className="feature-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--green-dim)] flex items-center justify-center group-hover:bg-[rgba(0,217,126,0.15)] transition-colors text-lg">
                    {f.icon}
                  </div>
                  <span className="font-mono-data text-xs text-[var(--green)] opacity-60">{f.stat}</span>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-32 border-t border-[rgba(255,255,255,0.05)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="font-mono-data text-xs text-[var(--green)] mb-3">{"// THE FLOW"}</div>
            <h2 className="font-heading font-bold text-4xl md:text-5xl tracking-tight">
              Card in. <span className="text-gradient">USDC out.</span>
            </h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,217,126,0.5), transparent)' }} />
            <div className="grid md:grid-cols-3 gap-8 relative">
              {[
                { icon: "💳", t: "Customer pays", d: "Accept Visa, Mastercard, or any card via Dodo Payments checkout — works anywhere on the web." },
                { icon: "🔄", t: "Auto convert", d: "Funds settle to USDC on Solana instantly via our settlement engine." },
                { icon: "✅", t: "Contractor paid", d: "Payouts hit recipient wallets in <2s, anywhere on earth." },
              ].map((s, i) => (
                <div key={s.t} className="relative text-center">
                  <div className="relative inline-flex mb-6">
                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-glow text-3xl" style={{ background: 'linear-gradient(135deg, var(--green-light), var(--green))' }}>
                      {s.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--bg-base)] border-2 border-[var(--green)] flex items-center justify-center font-mono-data text-xs font-bold text-[var(--green)]">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2">{s.t}</h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LOGIN / CTA ═══ */}
      <section id="login" className="py-32 border-t border-[rgba(255,255,255,0.05)]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative glass rounded-3xl p-10 md:p-16 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--green-dim)] to-transparent opacity-50" />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[var(--green)] opacity-10 blur-3xl" />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              {/* Left */}
              <div>
                <div className="font-mono-data text-xs text-[var(--green)] mb-3">{"// GET STARTED"}</div>
                <h2 className="font-heading font-bold text-3xl md:text-5xl tracking-tight mb-4">
                  Welcome to the<br /><span className="text-gradient">future of payouts.</span>
                </h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  Sign in with a magic link. No passwords. Start sending payouts in minutes.
                </p>
                <ul className="space-y-2">
                  {["Passwordless authentication", "Instant USDC settlement", "Near-zero transfer fees"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 12 10 16 18 8" /></svg>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: form */}
              <div className="glass rounded-2xl p-6 border-[rgba(0,217,126,0.15)]">
                {sent ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-glow" style={{ background: 'linear-gradient(135deg, var(--green-light), var(--green))' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0B0F19" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 12 10 16 18 8" /></svg>
                    </div>
                    <h3 className="font-heading text-xl font-semibold mb-1">Check your inbox</h3>
                    <p className="text-sm text-[var(--text-secondary)]">We sent a magic link to {email}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <label htmlFor="email" className="font-mono-data text-[10px] text-[var(--text-muted)] tracking-wider uppercase">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full mt-2 mb-4 px-3.5 py-3 text-sm input-base"
                    />

                    {error && (
                      <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-[var(--red-dim)] border border-[var(--red-border)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        <p className="text-xs text-[var(--red)]">{error}</p>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3 text-sm btn-primary shadow-glow flex items-center justify-center gap-2 group">
                      {loading ? (
                        <>
                          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" /></svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Magic Link
                          <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[var(--text-muted)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Passwordless · No passwords to steal
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlashPayLogo size={28} />
            <FlashPayWordmark className="text-sm" />
            <span className="text-xs text-[var(--text-muted)] ml-3 font-mono-data">&copy; 2025</span>
          </div>
          <div className="text-xs text-[var(--text-muted)] font-mono-data">
            Built for the Dodo Payments &times; Superteam hackathon
          </div>
        </div>
      </footer>
    </div>
  );
}
