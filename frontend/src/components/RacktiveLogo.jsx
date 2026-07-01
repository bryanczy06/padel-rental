export default function RacktiveLogo({ size = 28, className = 'text-white' }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 40 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paddle head - rounded square */}
      <rect x="2" y="2" width="36" height="36" rx="10" stroke="currentColor" strokeWidth="3" fill="none" />
      {/* QR-like grid inside paddle head */}
      {/* Top-left block */}
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="0" />
      <rect x="9.5" y="9.5" width="4" height="4" fill="currentColor" opacity="0" />
      {/* Top-right block */}
      <rect x="23" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
      {/* Bottom-left block */}
      <rect x="7" y="23" width="10" height="10" rx="1.5" fill="currentColor" />
      {/* Center dots */}
      <rect x="19" y="9" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="9" y="19" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="19" y="14" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="24" y="19" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="19" y="24" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="24" y="24" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="29" y="19" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="29" y="24" width="3" height="3" rx="0.5" fill="currentColor" />
      {/* Stem / handle */}
      <rect x="18" y="38" width="4" height="10" rx="2" fill="currentColor" />
    </svg>
  )
}
