const config: Record<string, { className: string; label: string }> = {
  pending: { className: "badge-pending", label: "Pending" },
  processing: { className: "badge-processing", label: "Processing" },
  done: { className: "badge-done", label: "Confirmed" },
  failed: { className: "badge-failed", label: "Failed" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = config[status] || config.pending;
  return (
    <span className={`badge ${c.className}`}>
      <span className="badge-dot" />
      {c.label}
    </span>
  );
}
