import React from 'react';

export function PixelLogo({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* A letter in pixel style */}
      <rect x="8" y="8" width="4" height="4" fill="currentColor"/>
      <rect x="12" y="8" width="4" height="4" fill="currentColor"/>
      <rect x="16" y="8" width="4" height="4" fill="currentColor"/>
      <rect x="20" y="8" width="4" height="4" fill="currentColor"/>
      <rect x="24" y="8" width="4" height="4" fill="currentColor"/>
      
      <rect x="8" y="12" width="4" height="4" fill="currentColor"/>
      <rect x="28" y="12" width="4" height="4" fill="currentColor"/>
      
      <rect x="8" y="16" width="4" height="4" fill="currentColor"/>
      <rect x="28" y="16" width="4" height="4" fill="currentColor"/>
      
      <rect x="8" y="20" width="4" height="4" fill="currentColor"/>
      <rect x="12" y="20" width="4" height="4" fill="currentColor"/>
      <rect x="16" y="20" width="4" height="4" fill="currentColor"/>
      <rect x="20" y="20" width="4" height="4" fill="currentColor"/>
      <rect x="24" y="20" width="4" height="4" fill="currentColor"/>
      <rect x="28" y="20" width="4" height="4" fill="currentColor"/>
      
      <rect x="8" y="24" width="4" height="4" fill="currentColor"/>
      <rect x="28" y="24" width="4" height="4" fill="currentColor"/>
      
      <rect x="8" y="28" width="4" height="4" fill="currentColor"/>
      <rect x="28" y="28" width="4" height="4" fill="currentColor"/>
    </svg>
  );
}

export function PixelStar({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="10" y="2" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="6" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="6" width="4" height="4" fill="currentColor"/>
      <rect x="2" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="18" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="18" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="18" width="4" height="4" fill="currentColor"/>
      <rect x="2" y="22" width="4" height="4" fill="currentColor"/>
      <rect x="18" y="22" width="4" height="4" fill="currentColor"/>
    </svg>
  );
}

export function PixelLightning({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="10" y="2" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="6" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="10" width="4" height="4" fill="currentColor"/>
      <rect x="2" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="6" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="14" width="4" height="4" fill="currentColor"/>
      <rect x="10" y="18" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="18" width="4" height="4" fill="currentColor"/>
      <rect x="14" y="22" width="4" height="4" fill="currentColor"/>
    </svg>
  );
}

export function PixelUsers({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* First user */}
      <rect x="4" y="4" width="3" height="3" fill="currentColor"/>
      <rect x="4" y="8" width="3" height="3" fill="currentColor"/>
      <rect x="1" y="11" width="3" height="3" fill="currentColor"/>
      <rect x="4" y="11" width="3" height="3" fill="currentColor"/>
      <rect x="7" y="11" width="3" height="3" fill="currentColor"/>
      
      {/* Second user */}
      <rect x="14" y="4" width="3" height="3" fill="currentColor"/>
      <rect x="14" y="8" width="3" height="3" fill="currentColor"/>
      <rect x="11" y="11" width="3" height="3" fill="currentColor"/>
      <rect x="14" y="11" width="3" height="3" fill="currentColor"/>
      <rect x="17" y="11" width="3" height="3" fill="currentColor"/>
    </svg>
  );
}

export function PixelCheck({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="18" y="6" width="3" height="3" fill="currentColor"/>
      <rect x="15" y="9" width="3" height="3" fill="currentColor"/>
      <rect x="12" y="12" width="3" height="3" fill="currentColor"/>
      <rect x="9" y="15" width="3" height="3" fill="currentColor"/>
      <rect x="6" y="12" width="3" height="3" fill="currentColor"/>
    </svg>
  );
}

export function PixelClock({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Circle */}
      <rect x="8" y="4" width="8" height="3" fill="currentColor"/>
      <rect x="4" y="8" width="3" height="8" fill="currentColor"/>
      <rect x="17" y="8" width="3" height="8" fill="currentColor"/>
      <rect x="8" y="17" width="8" height="3" fill="currentColor"/>
      
      {/* Clock hands */}
      <rect x="11" y="8" width="2" height="4" fill="currentColor"/>
      <rect x="11" y="11" width="4" height="2" fill="currentColor"/>
    </svg>
  );
}
