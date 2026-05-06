export function TxHash({
  hash,
  cluster = "devnet",
}: {
  hash: string;
  cluster?: "devnet" | "mainnet";
}) {
  const truncated =
    hash.length > 16
      ? `${hash.slice(0, 8)}...${hash.slice(-8)}`
      : hash;

  const url =
    cluster === "devnet"
      ? `https://solscan.io/tx/${hash}?cluster=devnet`
      : `https://solscan.io/tx/${hash}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono-data text-xs text-[var(--text-muted)] hover:text-[var(--green)] transition-colors group"
    >
      {truncated}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}
