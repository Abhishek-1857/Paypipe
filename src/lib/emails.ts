import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export interface PayoutEmailParams {
  contractorName: string;
  contractorEmail: string | null;
  founderEmail: string;
  amountUsd: number;
  solanaSignature: string;
  cluster: "devnet" | "mainnet-beta";
}

function truncateSig(sig: string) {
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

function solscanUrl(sig: string, cluster: string) {
  const base = "https://solscan.io/tx/" + sig;
  return cluster === "devnet" ? base + "?cluster=devnet" : base;
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function contractorEmailHtml(params: PayoutEmailParams): string {
  const { contractorName, founderEmail, amountUsd, solanaSignature, cluster } = params;
  const amt = formatAmount(amountUsd);
  const url = solscanUrl(solanaSignature, cluster);
  const sig = truncateSig(solanaSignature);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You've been paid $${amt} USDC</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111113;border-radius:12px;border:1px solid #1E1E24;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1E1E24;">
          <div style="font-size:24px;font-weight:900;color:#00D97E;letter-spacing:-0.5px;">FlashPay</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;text-align:center;">
          <div style="width:64px;height:64px;background:#0D2E1F;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
            <div style="font-size:28px;line-height:64px;">💸</div>
          </div>
          <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#F2F2F3;line-height:1.2;">You received $${amt} USDC</h1>
          <p style="margin:0 0 32px;font-size:14px;color:#8A8A96;">Hi ${contractorName}, sent by <span style="color:#C0C0CC;">${founderEmail}</span></p>

          <!-- CTA Button -->
          <a href="${url}" style="display:inline-block;background:#00D97E;color:#0A0A0B;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">View on Solscan →</a>

          <!-- Tx Hash -->
          <p style="margin:16px 0 32px;font-family:monospace;font-size:11px;color:#3A3A50;">${sig}</p>

          <!-- Pills -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="padding:0 4px;"><span style="display:inline-block;background:#1A1A1F;border:1px solid #2A2A30;border-radius:99px;padding:6px 14px;color:#8A8A96;font-size:12px;">⚡ Settled in ~2 seconds</span></td>
              <td style="padding:0 4px;"><span style="display:inline-block;background:#1A1A1F;border:1px solid #2A2A30;border-radius:99px;padding:6px 14px;color:#8A8A96;font-size:12px;">💸 Fee: ~$0.001</span></td>
              <td style="padding:0 4px;"><span style="display:inline-block;background:#1A1A1F;border:1px solid #2A2A30;border-radius:99px;padding:6px 14px;color:#8A8A96;font-size:12px;">🔒 Stablecoin: always $1</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #1E1E24;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3A3A50;">Powered by FlashPay · Built on Solana · Payments by Dodo Payments</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function founderEmailHtml(params: PayoutEmailParams): string {
  const { contractorName, amountUsd, solanaSignature, cluster } = params;
  const amt = formatAmount(amountUsd);
  const url = solscanUrl(solanaSignature, cluster);
  const sig = truncateSig(solanaSignature);
  const now = new Date().toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const rows = [
    { label: "Contractor", value: contractorName, color: "#F2F2F3", bg: "#111113" },
    { label: "Amount", value: `$${amt} USDC`, color: "#00D97E", bg: "#161618" },
    { label: "Network", value: "Solana", color: "#F2F2F3", bg: "#111113" },
    { label: "Network Fee", value: "~$0.001", color: "#F2F2F3", bg: "#161618" },
    { label: "Status", value: "✓ Confirmed", color: "#00D97E", bg: "#111113" },
    { label: "Time", value: now, color: "#8A8A96", bg: "#161618" },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>✓ $${amt} sent to ${contractorName}</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111113;border-radius:12px;border:1px solid #1E1E24;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #1E1E24;">
          <div style="font-size:24px;font-weight:900;color:#00D97E;letter-spacing:-0.5px;">FlashPay</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#00D97E;text-align:center;">Payout Confirmed ✓</h1>
          <p style="margin:0 0 32px;font-size:14px;color:#8A8A96;text-align:center;">Your payment has been settled on Solana.</p>

          <!-- Summary Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #1E1E24;margin-bottom:32px;">
            ${rows.map(r => `<tr>
              <td style="padding:12px 16px;font-size:13px;color:#8A8A96;background:${r.bg};width:40%;">${r.label}</td>
              <td style="padding:12px 16px;font-size:13px;color:${r.color};background:${r.bg};font-weight:${r.color === "#00D97E" ? "700" : "400"};">${r.value}</td>
            </tr>`).join("")}
          </table>

          <!-- CTA Button -->
          <div style="text-align:center;">
            <a href="${url}" style="display:inline-block;background:#00D97E;color:#0A0A0B;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">View Transaction on Solscan →</a>
            <p style="margin:12px 0 0;font-family:monospace;font-size:11px;color:#3A3A50;">${sig}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #1E1E24;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3A3A50;">Powered by FlashPay · Built on Solana · Payments by Dodo Payments</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPayoutEmails(params: PayoutEmailParams): Promise<void> {
  const { contractorName, contractorEmail, founderEmail, amountUsd } = params;
  const amt = formatAmount(amountUsd);

  try {
    const sends: Promise<unknown>[] = [];

    // Contractor email — only if they have an email
    if (contractorEmail) {
      sends.push(
        resend.emails.send({
          from: FROM,
          to: contractorEmail,
          subject: `You've been paid $${amt} USDC`,
          html: contractorEmailHtml(params),
        })
      );
    }

    // Founder confirmation — always
    sends.push(
      resend.emails.send({
        from: FROM,
        to: founderEmail,
        subject: `✓ $${amt} sent to ${contractorName}`,
        html: founderEmailHtml(params),
      })
    );

    await Promise.all(sends);
  } catch (err) {
    console.error("[sendPayoutEmails] Failed to send emails:", err);
  }
}
