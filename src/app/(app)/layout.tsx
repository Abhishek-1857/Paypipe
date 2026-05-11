"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  "/treasury": "Treasury",
};

interface Notification {
  id: string;
  type: "payout_done" | "payout_failed" | "scheduled_due" | "scheduled_overdue" | "contractor_joined" | "low_treasury";
  message: string;
  detail?: string;
  timestamp: string;
  actionRequired: boolean;
  href?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NOTIF_READ_KEY = "notif_read_at";

function getLastReadAt(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(NOTIF_READ_KEY);
  return val ? Number(val) : 0;
}

function setLastReadAt() {
  localStorage.setItem(NOTIF_READ_KEY, String(Date.now()));
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastReadAt, setLastReadAtState] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
    setLastReadAtState(getLastReadAt());
  }, []);

  const fetchNotifications = useCallback(async () => {
    const results: Notification[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const today = now.toISOString().split("T")[0];

    const [payoutsRes, scheduledRes, contractorsRes, treasuryRes] = await Promise.allSettled([
      fetch("/api/payouts").then((r) => r.ok ? r.json() : []),
      fetch("/api/scheduled-payouts").then((r) => r.ok ? r.json() : []),
      fetch("/api/contractors").then((r) => r.ok ? r.json() : []),
      fetch("/api/treasury/info").then((r) => r.ok ? r.json() : null),
    ]);

    // Payout completed / failed (last 24h)
    if (payoutsRes.status === "fulfilled" && Array.isArray(payoutsRes.value)) {
      for (const p of payoutsRes.value) {
        if (!p.created_at || p.created_at < yesterday) continue;
        if (p.status === "done") {
          results.push({
            id: `payout-done-${p.id}`,
            type: "payout_done",
            message: `USDC sent to ${p.contractors?.name || "Unknown"}`,
            detail: `$${Number(p.amount_usd).toFixed(2)} completed`,
            timestamp: p.created_at,
            actionRequired: false,
            href: "/payouts",
          });
        } else if (p.status === "failed") {
          results.push({
            id: `payout-fail-${p.id}`,
            type: "payout_failed",
            message: `Payment to ${p.contractors?.name || "Unknown"} failed`,
            detail: p.error_message || "Check payout details",
            timestamp: p.created_at,
            actionRequired: false,
            href: "/payouts",
          });
        }
      }
    }

    // Scheduled due / overdue
    if (scheduledRes.status === "fulfilled" && Array.isArray(scheduledRes.value)) {
      for (const s of scheduledRes.value) {
        if (s.status !== "active" || !s.next_due_date) continue;
        if (s.next_due_date > today) continue;
        const isOverdue = s.next_due_date < today;
        results.push({
          id: `sched-${s.id}`,
          type: isOverdue ? "scheduled_overdue" : "scheduled_due",
          message: `${isOverdue ? "Overdue" : "Due today"}: ${s.contractors?.name || "Unknown"}`,
          detail: `$${Number(s.amount_usd).toFixed(2)} USDC scheduled payout`,
          timestamp: s.next_due_date + "T00:00:00Z",
          actionRequired: true,
          href: "/scheduled-payouts",
        });
      }
    }

    // Contractor joined (last 24h)
    if (contractorsRes.status === "fulfilled" && Array.isArray(contractorsRes.value)) {
      for (const c of contractorsRes.value) {
        if (!c.created_at || c.created_at < yesterday) continue;
        results.push({
          id: `contractor-${c.id}`,
          type: "contractor_joined",
          message: `${c.name} added as contractor`,
          detail: c.email || "No email",
          timestamp: c.created_at,
          actionRequired: false,
          href: "/contractors",
        });
      }
    }

    // Low treasury
    if (treasuryRes.status === "fulfilled" && treasuryRes.value && typeof treasuryRes.value.balance === "number") {
      const bal = treasuryRes.value.balance;
      if (bal < 100) {
        results.push({
          id: "treasury-low",
          type: "low_treasury",
          message: "Treasury balance low",
          detail: `$${bal.toFixed(2)} USDC remaining`,
          timestamp: now.toISOString(),
          actionRequired: false,
          href: "/treasury",
        });
      }
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setNotifications(results);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [pathname, fetchNotifications]);

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

  function handleMarkAllRead() {
    setLastReadAt();
    setLastReadAtState(Date.now());
  }

  const unreadCount = notifications.filter((n) => {
    if (n.actionRequired) return true;
    return new Date(n.timestamp).getTime() > lastReadAt;
  }).length;

  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] || "Payzap";

  const initials = userEmail?.[0]?.toUpperCase() ?? "?";

  function notifIcon(type: Notification["type"]) {
    switch (type) {
      case "payout_done":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,230,160,0.12)", border: "1px solid rgba(0,230,160,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E6A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case "payout_failed":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,92,92,0.12)", border: "1px solid rgba(255,92,92,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        );
      case "scheduled_due":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,173,51,0.12)", border: "1px solid rgba(255,173,51,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFAD33" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        );
      case "scheduled_overdue":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,92,92,0.12)", border: "1px solid rgba(255,92,92,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        );
      case "contractor_joined":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,230,160,0.12)", border: "1px solid rgba(0,230,160,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E6A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
            </svg>
          </div>
        );
      case "low_treasury":
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,173,51,0.12)", border: "1px solid rgba(255,173,51,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFAD33" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 3H8a2 2 0 0 0-2 2v2" /><circle cx="18" cy="14" r="1.5" fill="#FFAD33" />
            </svg>
          </div>
        );
    }
  }

  function notifBadgeColor(type: Notification["type"]): { bg: string; color: string } {
    switch (type) {
      case "payout_done":
      case "contractor_joined":
        return { bg: "rgba(0,230,160,0.15)", color: "#00E6A0" };
      case "payout_failed":
      case "scheduled_overdue":
        return { bg: "rgba(255,92,92,0.15)", color: "#FF5C5C" };
      case "scheduled_due":
      case "low_treasury":
        return { bg: "rgba(255,173,51,0.15)", color: "#FFAD33" };
    }
  }

  function notifBadgeLabel(type: Notification["type"]): string {
    switch (type) {
      case "payout_done": return "SENT";
      case "payout_failed": return "FAILED";
      case "scheduled_due": return "DUE";
      case "scheduled_overdue": return "OVERDUE";
      case "contractor_joined": return "NEW";
      case "low_treasury": return "LOW";
    }
  }

  const hasScheduledDue = notifications.some((n) => n.type === "scheduled_due" || n.type === "scheduled_overdue");

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
                style={{ color: unreadCount > 0 ? "var(--text-primary)" : "var(--text-muted)" }}
                title="Notifications"
                onClick={() => setNotifOpen((o) => !o)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold animate-pulse"
                    style={{ background: "#FFAD33", color: "#080C14", border: "2px solid var(--header-bg)" }}
                  >
                    {unreadCount}
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,173,51,0.15)", color: "#FFAD33" }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium transition-colors"
                        style={{ color: "var(--green)" }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[340px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" style={{ opacity: 0.5 }}>
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No notifications right now</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const isUnread = n.actionRequired || new Date(n.timestamp).getTime() > lastReadAt;
                        const badge = notifBadgeColor(n.type);
                        return (
                          <button
                            key={n.id}
                            onClick={() => { setNotifOpen(false); if (n.href) router.push(n.href); }}
                            className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-[var(--bg-hover)]"
                            style={{ borderBottom: "1px solid var(--border)", opacity: isUnread ? 1 : 0.6 }}
                          >
                            {notifIcon(n.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">{n.message}</p>
                              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {n.detail}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                                {timeAgo(n.timestamp)}
                              </p>
                            </div>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                              style={{ background: badge.bg, color: badge.color }}
                            >
                              {notifBadgeLabel(n.type)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {hasScheduledDue && (
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
