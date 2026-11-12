import React from 'react';

interface EvalniumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtext?: boolean;
  inverted?: boolean;
  className?: string;
}

export const EvalniumLogo: React.FC<EvalniumLogoProps> = ({
  size = 'md',
  showSubtext = false,
  inverted = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const titleSizes = {
    sm: 'text-[16px] font-extrabold',
    md: 'text-lg font-extrabold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl font-extrabold',
  }[size];

  const subtextSizes = {
    sm: 'text-[9.5px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-xs',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none min-w-0 ${className}`}>
      {/* Evalnium Brand Mark */}
      <div
        className={`relative shrink-0 flex items-center justify-center ${iconDimensions} ${
          inverted ? 'bg-white/95 rounded-lg p-0.5' : ''
        }`}
      >
        <img
          src="/evalnium-icon.png"
          alt="Evalnium logo"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Wordmark */}
      <div className="flex flex-col leading-none min-w-0">
        <span
          className={`tracking-tight truncate ${titleSizes} ${
            inverted ? 'text-white' : 'text-[#0F172A]'
          }`}
        >
          Evalnium
        </span>
        {showSubtext && (
          <span
            className={`hidden sm:block font-semibold uppercase tracking-[0.12em] mt-0.5 truncate ${subtextSizes} ${
              inverted ? 'text-slate-300' : 'text-[#475569]'
            }`}
          >
            Assessment Portal
          </span>
        )}
      </div>
    </div>
  );
};
