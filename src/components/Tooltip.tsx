'use client';

import { ReactNode } from 'react';

interface TooltipProps {
 
  content: string;
 
  children: ReactNode;
 
  position?: 'top' | 'bottom' | 'left' | 'right';
}


export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group">
      {children}
      <div
        className={`
          absolute ${positionClasses[position]} z-50
          px-2 py-1 text-xs text-white bg-black/90 rounded
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
          whitespace-nowrap
        `}
      >
        {content}
        
        <div
          className={`
            absolute ${position === 'top' ? 'top-full' : position === 'bottom' ? 'bottom-full' : 'left-1/2 -translate-x-1/2'}
            ${position === 'top' || position === 'bottom' ? 'left-1/2 -translate-x-1/2' : ''}
            w-0 h-0 border-4 border-transparent
            ${position === 'top' ? 'border-t-black/90' : position === 'bottom' ? 'border-b-black/90' : ''}
            ${position === 'left' ? 'border-l-black/90' : position === 'right' ? 'border-r-black/90' : ''}
          `}
        />
      </div>
    </div>
  );
}