import React from 'react'

export function EmptyAnalyticsIllustration({ className = 'w-32 h-32' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} text-muted-foreground/40`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Chart background */}
      <rect x="30" y="40" width="120" height="100" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      
      {/* Chart bars (empty state) */}
      <rect x="45" y="110" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <rect x="65" y="100" width="12" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <rect x="85" y="90" width="12" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <rect x="105" y="105" width="12" height="25" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      
      {/* Question mark */}
      <circle cx="140" cy="70" r="22" fill="currentColor" opacity="0.1" />
      <text
        x="140"
        y="80"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="currentColor"
        opacity="0.6"
      >
        ?
      </text>
      
      {/* Axis lines */}
      <line x1="40" y1="135" x2="140" y2="135" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <line x1="40" y1="45" x2="40" y2="135" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    </svg>
  )
}
