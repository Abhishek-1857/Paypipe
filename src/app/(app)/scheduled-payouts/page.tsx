"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
}

interface ScheduledPayment {
  id: string;
  scheduled_payout_id: string;
  payout_id: string | null;
  due_date: string;
  paid_date: string | null;
  status: string;
}

interface ScheduledPayout {
  id: string;
  contractor_id: string;
  amount_usd: number;
  day_of_month: number;
  status: string;
  last_paid_date: string | null;
  next_due_date: string;
  created_at: string;
  contractors: Contractor;
  payments: ScheduledPayment[];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getStatusInfo(schedule: ScheduledPayout): { label: string; color: string; bg: string; pulse: boolean } {
  if (schedule.status === "paused") {
    return { label: "PAUSED", color: "var(--text-muted)", bg: "var(--bg-elevated)", pulse: false };
  }

  const today = new Date().toISOString().split("T")[0];
  const due = schedule.next_due_date;

  if (due === today) {
    return { label: "DUE TODAY", color: "#FFAD33", bg: "rgba(255,173,51,0.12)", pulse: true };
  }
  if (due < today) {
    return { label: "OVERDUE", color: "#FF5C5C", bg: "rgba(255,92,92,0.12)", pulse: false };
  }

  const dueDate = new Date(due + "T00:00:00");
  const formatted = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label: `Next: ${formatted}`, color: "var(--text-muted)", bg: "var(--bg-elevated)", pulse: false };
}

function isDueOrOverdue(schedule: ScheduledPayout) {
  if (schedule.status !== "active") return false;
  const today = new Date().toISOString().split("T")[0];
  return schedule.next_due_date <= today;
}

export default function ScheduledPayoutsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledPayout[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [formContractorId, setFormContractorId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDay, setFormDay] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/scheduled-payouts"),
        fetch("/api/contractors"),
      ]);
      const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
      setSchedules(Array.isArray(sData) ? sData : []);
      setContractors(Array.isArray(cData) ? cData : []);
    } catch {
      toast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const amount = parseFloat(formAmount);
    if (!formContractorId) { toast("Select a contractor", "error"); return; }
    if (!amount || amount < 1 || amount > 10) { toast("Amount must be $1-$10", "error"); return; }

    setCreating(true);
    try {
      const res = await fetch("/api/scheduled-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: formContractorId,
          amountUsd: amount,
          dayOfMonth: parseInt(formDay),
        }),
      });
      if (res.ok) {
        toast("Schedule created", "success");
        setShowForm(false);
        setFormContractorId("");
        setFormAmount("");
        setFormDay("1");
        fetchData();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to create", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(id: string, action: "pause" | "resume" | "cancel") {
    try {
      const res = await fetch(`/api/scheduled-payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast(action === "cancel" ? "Schedule cancelled" : action === "pause" ? "Schedule paused" : "Schedule resumed", "success");
        setConfirmCancel(null);
        fetchData();
      } else {
        toast("Action failed", "error");
      }
    } catch {
      toast("Network error", "error");
    }
  }

  function handlePayNow(schedule: ScheduledPayout) {
    const pendingPayment = schedule.payments.find((p) => p.status === "pending");
    const params = new URLSearchParams({
      amount: String(schedule.amount_usd),
      scheduled_payout_id: schedule.id,
      ...(pendingPayment && { scheduled_payment_id: pendingPayment.id }),
    });
    router.push(`/pay/${schedule.contractor_id}?${params.toString()}`);
  }

  const activeSchedules = schedules.filter((s) => s.status === "active");
  const totalMonthly = activeSchedules.reduce((sum, s) => sum + Number(s.amount_usd), 0);
  const dueCount = activeSchedules.filter(isDueOrOverdue).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--green)] rounded-full animate-spin mr-3" />
        Loading scheduled payouts...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="flex-[11_11_0%] min-w-0">
          {/* Header + New button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-[var(--text-muted)]">
                Set it once, get reminded every month
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              style={{ background: "var(--green)", color: "#080C14" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Schedule
            </button>
          </div>

          {/* New Schedule Form */}
          {showForm && (
            <div
              className="card p-5 mb-6 animate-fade-in"
              style={{ borderColor: "rgba(0,230,160,0.25)", borderLeftWidth: "3px", borderLeftColor: "var(--green)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
                New Scheduled Payout
              </p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Contractor
                  </label>
                  <select
                    value={formContractorId}
                    onChange={(e) => setFormContractorId(e.target.value)}
                    className="input-base w-full text-sm py-2 px-3 rounded-lg"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="">Select...</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="5.00"
                    className="input-base w-full text-sm py-2 px-3 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Day of Month
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="input-base w-full text-sm py-2 px-3 rounded-lg"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{getOrdinal(d)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="text-sm px-5 py-2 rounded-lg font-medium transition-all"
                  style={{ background: "var(--green)", color: "#080C14" }}
                >
                  {creating ? "Creating..." : "Create Schedule"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Schedule Cards */}
          {schedules.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No scheduled payouts yet</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Create a schedule to get reminded when it&apos;s time to pay your contractors.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const c = schedule.contractors;
                const statusInfo = getStatusInfo(schedule);
                const showPayNow = isDueOrOverdue(schedule);
                const paidCount = schedule.payments.filter((p) => p.status === "paid").length;

                return (
                  <div
                    key={schedule.id}
                    className="card p-5 transition-all duration-200"
                    style={{
                      borderColor: showPayNow ? "rgba(255,173,51,0.3)" : undefined,
                      boxShadow: showPayNow ? "0 0 24px rgba(255,173,51,0.06)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--green-light), var(--green))" }}
                      >
                        <span className="text-xs font-bold" style={{ color: "var(--bg-base)" }}>
                          {c ? getInitials(c.name) : "?"}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {c?.name || "Unknown"}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.pulse ? "animate-pulse" : ""}`}
                            style={{ background: statusInfo.bg, color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Every {getOrdinal(schedule.day_of_month)} · {paidCount} payment{paidCount !== 1 ? "s" : ""} made
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0 mr-4">
                        <p className="font-mono-data text-base font-semibold" style={{ color: "var(--green)" }}>
                          ${Number(schedule.amount_usd).toFixed(2)}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>USDC / month</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {showPayNow && (
                          <button
                            onClick={() => handlePayNow(schedule)}
                            className="text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                            style={{
                              background: "var(--green)",
                              color: "#080C14",
                              boxShadow: "0 0 16px rgba(0,230,160,0.3)",
                            }}
                          >
                            Pay Now →
                          </button>
                        )}

                        {schedule.status === "active" && (
                          <button
                            onClick={() => handleAction(schedule.id, "pause")}
                            className="text-xs px-3 py-2 rounded-lg transition-colors"
                            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                          >
                            Pause
                          </button>
                        )}

                        {schedule.status === "paused" && (
                          <button
                            onClick={() => handleAction(schedule.id, "resume")}
                            className="text-xs px-3 py-2 rounded-lg transition-colors"
                            style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(0,230,160,0.2)" }}
                          >
                            Resume
                          </button>
                        )}

                        {confirmCancel === schedule.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAction(schedule.id, "cancel")}
                              className="text-[10px] px-2.5 py-1.5 rounded-md font-medium"
                              style={{ background: "rgba(255,92,92,0.15)", color: "#FF5C5C" }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmCancel(null)}
                              className="text-[10px] px-2.5 py-1.5 rounded-md"
                              style={{ color: "var(--text-muted)" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancel(schedule.id)}
                            className="text-[10px] px-2 py-1.5 rounded-md transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#FF5C5C")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Summary */}
        <div className="flex-[5_5_0%] min-w-[240px] self-start sticky top-20 space-y-4">
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: "var(--text-muted)" }}>
              Schedule Summary
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Monthly Total</p>
                <p className="font-mono-data text-2xl font-bold" style={{ color: "var(--green)" }}>
                  ${totalMonthly.toFixed(2)}
                </p>
              </div>
              <div className="h-px" style={{ background: "var(--border)" }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Active</p>
                  <p className="font-mono-data text-lg font-semibold text-[var(--text-primary)]">{activeSchedules.length}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: dueCount > 0 ? "#FFAD33" : "var(--text-muted)" }}>
                    Due / Overdue
                  </p>
                  <p className="font-mono-data text-lg font-semibold" style={{ color: dueCount > 0 ? "#FFAD33" : "var(--text-primary)" }}>
                    {dueCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--text-muted)" }}>
              How it works
            </p>
            <div className="space-y-0">
              {[
                "Set a monthly schedule",
                "Get reminded when due",
                "Approve & pay via card",
                "USDC sent automatically",
              ].map((step, i, arr) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                    >
                      <span className="text-[9px] font-mono-data" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-px my-1" style={{ height: "12px", background: "var(--border)" }} />
                    )}
                  </div>
                  <p className="text-xs pb-2 pt-0.5" style={{ color: "var(--text-muted)" }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
