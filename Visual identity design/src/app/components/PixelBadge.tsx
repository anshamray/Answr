import React from 'react';

interface PixelBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  className?: string;
}

export function PixelBadge({ children, variant = 'primary', className = '' }: PixelBadgeProps) {
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    accent: 'bg-accent text-accent-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground'
  };
  
  return (
    <span className={`inline-block px-3 py-1 text-xs font-bold border-2 border-black ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
