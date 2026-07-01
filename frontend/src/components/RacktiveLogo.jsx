export default function RacktiveLogo({ size = 28, className = 'text-white' }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.28)}
      viewBox="0 0 100 128"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paddle head — rounded square border */}
      <rect x="3" y="3" width="94" height="94" rx="20" fill="none" stroke="currentColor" strokeWidth="6"/>

      {/* ── Finder top-left ── */}
      <rect x="13" y="13" width="27" height="27" rx="4" fill="currentColor"/>
      <rect x="18" y="18" width="17" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="0"/>
      {/* white inner */}
      <rect x="19" y="19" width="15" height="15" rx="2" fill="white"/>
      <rect x="23" y="23" width="7" height="7" rx="1" fill="currentColor"/>

      {/* ── Finder top-right ── */}
      <rect x="60" y="13" width="27" height="27" rx="4" fill="currentColor"/>
      <rect x="65" y="19" width="15" height="15" rx="2" fill="white"/>
      <rect x="70" y="23" width="7" height="7" rx="1" fill="currentColor"/>

      {/* ── Finder bottom-left ── */}
      <rect x="13" y="60" width="27" height="27" rx="4" fill="currentColor"/>
      <rect x="19" y="65" width="15" height="15" rx="2" fill="white"/>
      <rect x="23" y="70" width="7" height="7" rx="1" fill="currentColor"/>

      {/* ── Data dots (bottom-right quadrant + center) ── */}
      <rect x="60" y="60" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="71" y="60" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="82" y="60" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="60" y="71" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="82" y="71" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="60" y="82" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="71" y="82" width="7" height="7" rx="1.5" fill="currentColor"/>

      {/* center dots */}
      <rect x="45" y="13" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="45" y="24" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="13" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="24" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="45" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="60" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="71" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="82" y="45" width="7" height="7" rx="1.5" fill="currentColor"/>

      {/* ── Stem ── */}
      <rect x="44" y="97" width="12" height="28" rx="6" fill="currentColor"/>
    </svg>
  )
}
