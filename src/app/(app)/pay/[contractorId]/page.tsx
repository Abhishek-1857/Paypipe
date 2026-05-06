"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/toast";
import { TxHash } from "@/components/tx-hash";
import { WalletAddress } from "@/components/wallet-address";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
  solana_wallet: string;
}

interface Payout {
  id: string;
  status: string;
  solana_tx_sig: string | null;
  amount_usd: number;
}

const steps = ["pending", "processing", "done"];

export default function PayPage({
  params,
}: {
  params: { contractorId: string };
}) {
  const { contractorId } = params;
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [completedPayout, setCompletedPayout] = useState<Payout | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/contractors`)
      .then((r) => r.json())
      .then((data: Contractor[]) => {
        const c = data.find((c) => c.id === contractorId);
        setContractor(c || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contractorId]);

  const pollForCompletion = useCallback(() => {
    setPolling(true);
    setCurrentStep(0);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payouts?contractorId=${contractorId}`);
        if (!res.ok) return;
        const payouts: Payout[] = await res.json();
        const latest = payouts[0];

        if (latest) {
          const stepIdx = steps.indexOf(latest.status);
          if (stepIdx >= 0) setCurrentStep(stepIdx);

          if (latest.status === "done" || latest.status === "failed") {
            clearInterval(interval);
            setPolling(false);

            if (latest.status === "done") {
              setCompletedPayout(latest);
              setShowSuccess(true);
              toast("USDC sent successfully!", "success");
            } else {
              toast("Payout failed — you can retry from the dashboard", "error");
            }
          }
        }
      } catch {
        // keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [contractorId, toast]);

  async function handlePay() {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1 || amountNum > 10) {
      toast("Amount must be between $1 and $10", "error");
      return;
    }

    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, amountUsd: amountNum }),
      });
      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast(data.error || "Failed to create checkout", "error");
        setPaying(false);
      }
    } catch {
      toast("Network error", "error");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        Contractor not found.
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto animate-fade-in relative z-[1]">
      {showSuccess && <Confetti />}

      {/* Contractor Info */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
            <span className="font-heading font-semibold text-[var(--green)]">
              {contractor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-heading font-semibold text-lg text-[var(--text-primary)]">
              {contractor.name}
            </h2>
            <WalletAddress address={contractor.solana_wallet} />
          </div>
        </div>
      </div>

      {completedPayout ? (
        <div className="card p-6 animate-fade-in">
          {/* Success checkmark */}
          <div className="flex flex-col items-center py-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--green-dim)] flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline
                  points="6 12 10 16 18 8"
                  stroke="var(--green)"
                  strokeDasharray="24"
                  className="animate-draw-check"
                />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-lg text-[var(--text-primary)] mb-1">
              Payment Complete
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <span className="font-mono-data text-[var(--green)]">
                ${Number(completedPayout.amount_usd).toFixed(2)}
              </span>{" "}
              USDC sent successfully
            </p>
            {completedPayout.solana_tx_sig && (
              <div className="card p-3 w-full flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  Transaction
                </span>
                <TxHash hash={completedPayout.solana_tx_sig} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-6">
          {polling ? (
            <div className="py-6">
              {/* Progress steps */}
              <div className="flex items-center justify-between mb-8 px-2">
                {steps.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                          i <= currentStep
                            ? "bg-[var(--green)] text-[#0A0A0B]"
                            : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        }`}
                      >
                        {i < currentStep ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 12 10 16 18 8" />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1.5 capitalize">
                        {step === "done" ? "confirmed" : step}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-[2px] mx-2 mb-5">
                        <div
                          className={`h-full rounded transition-colors ${
                            i < currentStep
                              ? "bg-[var(--green)]"
                              : "bg-[var(--border)]"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="h-1 rounded-full overflow-hidden bg-[var(--bg-elevated)] mb-3">
                  <div className="h-full progress-bar rounded-full" />
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Processing USDC transfer on Solana...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Amount Input */}
              <div className="py-6 text-center">
                <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-4">
                  Amount
                </label>
                <div className="relative inline-flex items-center">
                  <span className="text-[var(--text-muted)] font-mono-data text-5xl mr-1">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-40 text-5xl font-mono-data text-[var(--green)] bg-transparent border-none outline-none text-center placeholder:text-[var(--border-bright)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <p className="text-sm text-[var(--text-muted)] mt-2 font-mono-data animate-fade-in">
                    ≈ {parseFloat(amount).toFixed(2)} USDC on Solana
                  </p>
                )}
              </div>

              {/* Fee breakdown */}
              <div className="border-t border-[var(--border)] pt-4 mb-4">
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                  <span>Solana network fee</span>
                  <span className="font-mono-data">~$0.001</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                  <span>Settlement time</span>
                  <span className="font-mono-data">{"<"}2 seconds</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePay}
                  disabled={paying || !amount}
                  className="flex-1 py-3 text-sm btn-primary"
                >
                  {paying ? "Redirecting to checkout..." : "Pay via Card"}
                </button>
                <button
                  onClick={pollForCompletion}
                  className="px-4 py-3 text-sm btn-secondary"
                  title="Check status"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
                Min $1 · Max $10 · Settled as USDC on Solana
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            backgroundColor: ["#00D97E", "#4D9EFF", "#F5A623", "#FF4D4D", "#8B5CF6"][
              i % 5
            ],
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
    </div>
  );
}
