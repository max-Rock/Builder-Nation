import React from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* 
        Place your SVG file in the public folder as 'logo.svg' 
        (e.g. C:\Users\Jigyansha\Desktop\Builder Nation\public\logo.svg)
      */}
      <img
        src="/logo.svg"
        alt="Builder Nation"
        className="h-16 w-auto object-contain"
        onError={(e) => {
          // Fallback just in case the logo.svg is missing
          e.currentTarget.style.display = 'none';
        }}
      />


    </div>
  );
}
