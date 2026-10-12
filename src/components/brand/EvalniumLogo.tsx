import React from 'react';

interface EvalniumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
  inverted?: boolean;
  className?: string;
}

export const EvalniumLogo: React.FC<EvalniumLogoProps> = ({
  size = 'md',
  showSubtext = true,
  inverted = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const titleSizes = {
    sm: 'text-base font-extrabold',
    md: 'text-lg font-black',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black',
  }[size];

  const subtextSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-xs',
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* SVG Emblem */}
      <div className={`relative shrink-0 ${iconDimensions}`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-xs">
          <defs>
            <linearGradient id="logoEvalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="logoInnerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Shield Base */}
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logoEvalGrad)" />
          <rect x="5" y="5" width="54" height="54" rx="15" stroke="url(#logoInnerGlow)" strokeWidth="1.5" />

          {/* Academic 'E' Emblem */}
          <path
            d="M19 18C19 16.8954 19.8954 16 21 16H43C44.1046 16 45 16.8954 45 18V21C45 22.1046 44.1046 23 43 23H27V28H39C40.1046 28 41 28.8954 41 30V33C41 34.1046 40.1046 35 39 35H27V40H44C45.1046 40 46 40.8954 46 42V45C46 46.1046 45.1046 47 44 47H21C19.8954 47 19 46.1046 19 45V18Z"
            fill="#ffffff"
          />

          {/* Assessment Precision Dots */}
          <circle cx="45" cy="18" r="3.5" fill="#38bdf8" />
          <circle cx="43" cy="45" r="3" fill="#6ee7b7" />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center space-x-1">
          <span className={`tracking-tight ${titleSizes} ${inverted ? 'text-white' : 'text-slate-900'}`}>
            EVAL<span className="text-indigo-600">NIUM</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-mono font-bold uppercase tracking-wider border border-indigo-200">
            CBT
          </span>
        </div>
        {showSubtext && (
          <span className={`font-semibold tracking-wider uppercase mt-0.5 ${subtextSizes} ${inverted ? 'text-slate-300' : 'text-slate-600'}`}>
            Mock Exam & Quiz Platform
          </span>
        )}
      </div>
    </div>
  );
};
