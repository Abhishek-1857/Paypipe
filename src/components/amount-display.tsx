export function AmountDisplay({
  amount,
  currency = "USD",
  size = "base",
}: {
  amount: number;
  currency?: "USD" | "USDC";
  size?: "sm" | "base" | "lg" | "xl";
}) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const sizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
  };

  return (
    <span className={`font-mono-data text-[var(--green)] ${sizeClasses[size]}`}>
      {currency === "USD" ? "$" : ""}
      {formatted}
      {currency === "USDC" && (
        <span className="text-[var(--text-muted)] text-[0.65em] ml-1">USDC</span>
      )}
    </span>
  );
}
