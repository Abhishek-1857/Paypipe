export function RemloLogo({ size = 36, className = "", animate = false }: { size?: number; className?: string; animate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'logo-animated' : ''}`}
    >
      <rect width="52" height="52" rx="12" fill="#00D97E"/>
      <path
        d="M14 33 L14 19 L22 19 C26 19 29 22 29 26 C29 30 26 33 22 33 L14 33Z"
        fill="none" stroke="#08080A" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M29 26 L38 33" stroke="#08080A" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function RemloWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-heading font-bold tracking-tight ${className}`}>
      <span style={{ color: '#F2F2F3', fontWeight: 700 }}>Rem</span><span style={{ color: '#00D97E', fontWeight: 700 }}>lo</span>
    </span>
  );
}
