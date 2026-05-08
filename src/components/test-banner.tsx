export function TestBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono-data" style={{ background: "var(--blue-dim)", color: "var(--blue)" }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: "var(--blue)" }} />
      Devnet
    </span>
  );
}
