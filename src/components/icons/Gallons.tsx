import React from 'react';

export const SlimGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="slimWater" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4facfe" />
        <stop offset="100%" stopColor="#00f2fe" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
      </filter>
    </defs>
    <g filter="url(#shadow)">
      {/* Main Body */}
      <rect x="25" y="20" width="50" height="95" rx="8" fill="url(#slimWater)" opacity="0.9" />
      {/* Gloss reflection */}
      <rect x="30" y="25" width="8" height="85" rx="4" fill="#ffffff" opacity="0.3" />
      
      {/* Indentations */}
      <line x1="25" y1="45" x2="75" y2="45" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <line x1="25" y1="65" x2="75" y2="65" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      <line x1="25" y1="85" x2="75" y2="85" stroke="#ffffff" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
      
      {/* Handle */}
      <path d="M 75 35 C 90 35, 90 60, 75 60" fill="none" stroke="url(#slimWater)" strokeWidth="6" strokeLinecap="round" />
      <path d="M 75 35 C 90 35, 90 60, 75 60" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      
      {/* Neck */}
      <path d="M 40 20 L 42 10 L 58 10 L 60 20 Z" fill="url(#slimWater)" />
      
      {/* Cap */}
      <rect x="38" y="5" width="24" height="6" rx="2" fill="#063d8a" />
      {/* Cap Highlight */}
      <rect x="40" y="5" width="20" height="2" fill="#ffffff" opacity="0.3" />
    </g>
  </svg>
);

export const RoundGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="roundWater" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00c6ff" />
        <stop offset="100%" stopColor="#0072ff" />
      </linearGradient>
      <filter id="shadow-round" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.1" />
      </filter>
    </defs>
    <g filter="url(#shadow-round)">
      {/* Main Body */}
      <path d="M 15 45 Q 10 80 15 110 Q 50 115 85 110 Q 90 80 85 45 L 70 20 L 60 10 L 40 10 L 30 20 Z" fill="url(#roundWater)" opacity="0.9" />
      
      {/* Gloss reflection center */}
      <path d="M 25 50 Q 20 80 25 105" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.3" strokeLinecap="round" />
      
      {/* Body ridges curved */}
      <path d="M 12 55 Q 50 65 88 55" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
      <path d="M 10 75 Q 50 85 90 75" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
      <path d="M 12 95 Q 50 105 88 95" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
      
      {/* Cap */}
      <rect x="38" y="5" width="24" height="7" rx="3" fill="#0a6ed1" />
      {/* Cap reflection */}
      <rect x="46" y="5" width="8" height="3" fill="#ffffff" opacity="0.4" />
    </g>
  </svg>
);
