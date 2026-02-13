import React from 'react';

interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function PixelInput({ label, className = '', ...props }: PixelInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="font-medium text-foreground">{label}</label>
      )}
      <input
        className={`px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all ${className}`}
        {...props}
      />
    </div>
  );
}
