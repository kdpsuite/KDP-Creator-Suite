import React from 'react'

export function EmptyJobsIllustration({ className = 'w-32 h-32' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} text-muted-foreground/40`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Queue/Stack boxes */}
      <rect x="40" y="50" width="60" height="35" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="45" y="60" width="60" height="35" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
      <rect x="50" y="70" width="60" height="35" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
      
      {/* Play button inside first box */}
      <circle cx="130" cy="115" r="28" fill="currentColor" opacity="0.1" />
      <polygon
        points="120,105 120,125 140,115"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Checkmark or progress indicator */}
      <circle cx="70" cy="155" r="18" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
      <path
        d="M 65 155 L 70 160 L 78 152"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  )
}
