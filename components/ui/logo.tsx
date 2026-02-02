"use client";

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`${sizes[size]} ${className} relative`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 to-medical-teal opacity-20 blur-xl animate-pulse-slow" />
      <svg viewBox="0 0 100 100" className="relative z-10">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="2"
          className="opacity-30"
        />
        <path
          d="M 50 20 L 50 45 M 50 55 L 50 80 M 25 50 L 45 50 M 55 50 L 75 50"
          stroke="#00d9ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 40 40 L 50 50 L 60 35"
          stroke="#00d9ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d9ff" />
            <stop offset="100%" stopColor="#20c997" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
