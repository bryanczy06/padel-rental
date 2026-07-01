export default function RacktiveLogo({ size = 28, className = 'text-white', bgColor = '#22c24e' }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.22)}
      viewBox="0 0 100 122"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Paddle head border */}
      <rect x="4" y="4" width="92" height="86" rx="18" stroke="currentColor" strokeWidth="7"/>

      {/* Finder top-left */}
      <rect x="14" y="13" width="24" height="24" rx="5" fill="currentColor"/>
      <rect x="19.5" y="18.5" width="13" height="13" rx="2.5" fill={bgColor}/>
      <rect x="23" y="22" width="6" height="6" rx="1" fill="currentColor"/>

      {/* Finder top-right */}
      <rect x="62" y="13" width="24" height="24" rx="5" fill="currentColor"/>
      <rect x="67.5" y="18.5" width="13" height="13" rx="2.5" fill={bgColor}/>
      <rect x="71" y="22" width="6" height="6" rx="1" fill="currentColor"/>

      {/* Finder bottom-left */}
      <rect x="14" y="56" width="24" height="24" rx="5" fill="currentColor"/>
      <rect x="19.5" y="61.5" width="13" height="13" rx="2.5" fill={bgColor}/>
      <rect x="23" y="65" width="6" height="6" rx="1" fill="currentColor"/>

      {/* Data dots bottom-right */}
      <rect x="62" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="73" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="84" y="56" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="62" y="67" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="73" y="67" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="84" y="67" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="62" y="78" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="84" y="78" width="7" height="7" rx="1.5" fill="currentColor"/>

      {/* Center / timing dots */}
      <rect x="42" y="13" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="42" y="24" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="14" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="25" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="42" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="62" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="73" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>
      <rect x="84" y="46" width="7" height="7" rx="1.5" fill="currentColor"/>

      {/* Stem */}
      <rect x="41" y="94" width="18" height="24" rx="9" fill="currentColor"/>
    </svg>
  )
}
