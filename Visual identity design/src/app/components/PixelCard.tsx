import React from 'react';

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export function PixelCard({ children, className = '', variant = 'default' }: PixelCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary/10 border-primary',
    secondary: 'bg-secondary/10 border-secondary',
    accent: 'bg-accent/10 border-accent'
  };
  
  return (
    <div className={`border-[3px] border-black pixel-shadow p-6 ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
