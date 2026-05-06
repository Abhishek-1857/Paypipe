export function FlashPayLogo({ size = 36, className = "", animate = false }: { size?: number; className?: string; animate?: boolean }) {
  const id = `logo-${size}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'logo-animated' : ''}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#33E49B" />
          <stop offset="100%" stopColor="#00D97E" />
        </linearGradient>
        <linearGradient id={`${id}-bolt`} x1="18" y1="4" x2="22" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="50%" stopColor="#FFAD33" />
          <stop offset="100%" stopColor="#FF8800" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="40" height="40" rx="12" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <path
          d="M22.5 6L12 22h7.5l-2 12L28 18h-7.5l2-12z"
          fill={`url(#${id}-bolt)`}
          className={animate ? 'bolt-flash' : ''}
        />
      </g>
    </svg>
  );
}

export function FlashPayWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-heading font-bold tracking-tight ${className}`}>
      Flash<span className="text-gradient">Pay</span>
    </span>
  );
}
