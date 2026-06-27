import React from 'react'

export function EmptyProjectsIllustration({ className = 'w-32 h-32' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} text-muted-foreground/40`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Book */}
      <path
        d="M50 40 L50 160 Q50 170 60 170 L140 170 Q150 170 150 160 L150 40 Q150 30 140 30 L60 30 Q50 30 50 40 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Book spine */}
      <line x1="50" y1="40" x2="50" y2="160" stroke="currentColor" strokeWidth="2" />
      {/* Pages */}
      <line x1="60" y1="50" x2="140" y2="50" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="70" x2="140" y2="70" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="90" x2="140" y2="90" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="110" x2="140" y2="110" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="130" x2="140" y2="130" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      
      {/* Plus icon */}
      <circle cx="130" cy="130" r="25" fill="currentColor" opacity="0.1" />
      <line x1="130" y1="115" x2="130" y2="145" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="115" y1="130" x2="145" y2="130" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
