export default function RacktiveLogo({ size = 28, className = 'text-white' }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.3)}
      viewBox="0 0 100 130"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paddle head - rounded square outline */}
      <rect x="4" y="4" width="92" height="92" rx="22" fill="none" stroke="currentColor" strokeWidth="8"/>

      {/* QR pattern inside - top-left finder */}
      <rect x="16" y="16" width="28" height="28" rx="4" fill="currentColor"/>
      <rect x="22" y="22" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="5"/>
      <rect x="27" y="27" width="6" height="6" rx="1" fill="currentColor"/>

      {/* QR pattern - top-right finder */}
      <rect x="56" y="16" width="28" height="28" rx="4" fill="currentColor"/>
      <rect x="62" y="22" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="5"/>
      <rect x="67" y="27" width="6" height="6" rx="1" fill="currentColor"/>

      {/* QR pattern - bottom-left finder */}
      <rect x="16" y="56" width="28" height="28" rx="4" fill="currentColor"/>
      <rect x="22" y="62" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="5"/>
      <rect x="27" y="67" width="6" height="6" rx="1" fill="currentColor"/>

      {/* QR center dots */}
      <rect x="56" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="67" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="78" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="56" y="67" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="78" y="67" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="67" y="78" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="78" y="78" width="7" height="7" rx="1.5" fill="currentColor"/>

      {/* Handle / stem */}
      <rect x="42" y="96" width="16" height="30" rx="8" fill="currentColor"/>
    </svg>
  )
}
