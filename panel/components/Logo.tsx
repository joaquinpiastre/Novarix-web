export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
      >
        N
      </text>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d0a5e" />
          <stop offset="0.5" stopColor="#7b2ff7" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-[#a855f7] to-[#c026d3] bg-clip-text font-semibold text-transparent ${className}`}
    >
      Novarix
    </span>
  );
}
