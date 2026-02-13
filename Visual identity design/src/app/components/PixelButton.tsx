import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function PixelButton({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: PixelButtonProps) {
  const baseStyles = 'font-medium transition-all duration-200 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed border-[3px] border-black';
  
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-dark pixel-shadow',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-dark pixel-shadow',
    accent: 'bg-accent text-accent-foreground hover:bg-accent-dark pixel-shadow',
    success: 'bg-success text-success-foreground hover:brightness-110 pixel-shadow',
    outline: 'bg-white text-foreground hover:bg-muted border-foreground pixel-shadow'
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
