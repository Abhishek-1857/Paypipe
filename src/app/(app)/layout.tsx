"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TestBadge } from "@/components/test-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";
import { createClient } from "@/lib/supabase/browser";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contractors": "Contractors",
  "/bulk-payout": "Bulk Payout",
  "/payouts": "Payout History",
  "/pay": "Send Payment",
  "/scheduled-payouts": "Scheduled Payouts",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scheduledDue, setScheduledDue] = useState<{ id: string; contractor_name: string; amount_usd: number; next_due_date: string; is_overdue: boolean }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    fetch("/api/scheduled-payouts")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; status: string; next_due_date: string; amount_usd: number; contractors: { name: string } }[]) => {
        if (!Array.isArray(data)) return;
        const today = new Date().toISOString().split("T")[0];
        setScheduledDue(
          data
            .filter((s) => s.status === "active" && s.next_due_date <= today)
            .map((s) => ({
              id: s.id,
              contractor_name: s.contractors?.name || "Unknown",
              amount_usd: Number(s.amount_usd),
              next_due_date: s.next_due_date,
              is_overdue: s.next_due_date < today,
            }))
        );
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] || "Payzap";

  const initials = userEmail?.[0]?.toUpperCase() ?? "?";

  return (
    <ToastProvider>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className="min-h-screen relative z-[1] transition-[margin] duration-300"
        style={{ marginLeft: collapsed ? "64px" : "200px" }}
      >
        <header className="h-14 flex items-center justify-between px-8 backdrop-blur-sm sticky top-0 z-10" style={{ borderBottom: "1px solid var(--header-border)", background: "var(--header-bg)" }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">Workspace</span>
            <span className="text-[var(--text-muted)]" style={{ opacity: 0.4 }}>/</span>
            <span className="font-medium text-[var(--text-primary)]">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Bell icon + notification panel */}
            <div className="relative" ref={notifRef}>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative"
                style={{ color: scheduledDue.length > 0 ? "var(--text-primary)" : "var(--text-muted)" }}
                title="Notifications"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {scheduledDue.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold animate-pulse"
                    style={{ background: "#FFAD33", color: "#080C14", border: "2px solid var(--header-bg)" }}
                  >
                    {scheduledDue.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50 animate-fade-in"
                  style={{
                    background: "var(--dropdown-bg)",
                    border: "1px solid var(--border)",
                    backdropFilter: "blur(24px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                    {scheduledDue.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,173,51,0.15)", color: "#FFAD33" }}>
                        {scheduledDue.length} pending
                      </span>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {scheduledDue.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" style={{ opacity: 0.5 }}>
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No notifications right now</p>
                      </div>
                    ) : (
                      scheduledDue.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { setNotifOpen(false); router.push("/scheduled-payouts"); }}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[var(--bg-hover)]"
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: n.is_overdue ? "rgba(255,92,92,0.12)" : "rgba(255,173,51,0.12)",
                              border: `1px solid ${n.is_overdue ? "rgba(255,92,92,0.2)" : "rgba(255,173,51,0.2)"}`,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={n.is_overdue ? "#FF5C5C" : "#FFAD33"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" />
                              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">
                              {n.is_overdue ? "Overdue" : "Due today"}: {n.contractor_name}
                            </p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              Scheduled payout of <span className="font-mono-data" style={{ color: "var(--green)" }}>${n.amount_usd.toFixed(2)}</span> USDC is {n.is_overdue ? "overdue" : "due today"}
                            </p>
                          </div>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                            style={{
                              background: n.is_overdue ? "rgba(255,92,92,0.15)" : "rgba(255,173,51,0.15)",
                              color: n.is_overdue ? "#FF5C5C" : "#FFAD33",
                            }}
                          >
                            {n.is_overdue ? "OVERDUE" : "DUE"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  {scheduledDue.length > 0 && (
                    <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                      <button
                        onClick={() => { setNotifOpen(false); router.push("/scheduled-payouts"); }}
                        className="w-full text-center text-xs font-medium py-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--green)" }}
                      >
                        View all scheduled payouts →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <TestBadge />

            {/* User dropdown */}
            {userEmail && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: dropdownOpen ? 'var(--green-dim)' : 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--green)',
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'var(--green)', color: 'var(--on-green)' }}
                  >
                    {initials}
                  </span>
                  <span className="hidden sm:block text-[11px] font-mono-data max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {userEmail}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden z-50 animate-fade-in"
                    style={{
                      background: 'var(--dropdown-bg)',
                      border: '1px solid var(--border)',
                      backdropFilter: 'blur(24px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}
                  >
                    {/* User header */}
                    <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, var(--green-light), var(--green))', color: 'var(--on-green)' }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{userEmail}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: 'var(--green)' }} />
                            <span className="text-[10px] font-mono-data" style={{ color: 'var(--green-text)' }}>Active · Devnet</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <div className="h-px mx-2 mb-2" style={{ background: 'var(--border)' }} />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                        style={{ color: 'var(--red)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--red-dim)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
