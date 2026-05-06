"use client";

import { useState } from "react";

export function WalletAddress({
  address,
  showCopy = true,
}: {
  address: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-6)}`
      : address;

  async function handleCopy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1.5 group relative">
      <span className="font-mono-data text-[var(--text-muted)] text-xs">
        {truncated}
      </span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      )}
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[var(--green-dim)] text-[var(--green)] text-[10px] font-medium whitespace-nowrap">
          Copied!
        </span>
      )}
    </span>
  );
}
