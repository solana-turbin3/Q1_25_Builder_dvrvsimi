import React from 'react';

interface LogoProps {
  size?: number;
  color?: string;
}

export function Logo({ size = 80, color = '#ffffff' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="App-logo"
    >
      <path 
        d="M50 10C27.909 10 10 27.909 10 50C10 72.091 27.909 90 50 90C72.091 90 90 72.091 90 50C90 27.909 72.091 10 50 10Z" 
        stroke={color} 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      <path 
        d="M50 25V50L65 65" 
        stroke={color} 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M30 40H40V70H30V40Z" 
        fill={color} 
      />
      <path 
        d="M60 40H70V70H60V40Z" 
        fill={color} 
      />
      <path 
        d="M45 30H55V35H45V30Z" 
        fill={color} 
      />
    </svg>
  );
} 