'use client';

import { useEffect, useRef } from 'react';
import { CameraPosition } from '@/types';

interface CameraOverlayProps {
 
  stream: MediaStream | null;
  
  position: CameraPosition;
  
  size: number;
  
  borderRadius: number;
  
  onClose?: () => void;
}


export function CameraOverlay({ 
  stream, 
  position, 
  size, 
  borderRadius,
  onClose 
}: CameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  
  if (!stream) return null;

  
  const positionClasses: Record<CameraPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  
  const borderRadiusPixels = (borderRadius / 100) * size;

  return (
    <div
      className={`absolute ${positionClasses[position]} z-10 shadow-2xl overflow-hidden`}
      style={{
        width: size,
        height: size,
        borderRadius: borderRadiusPixels,
      }}
    >
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
         
          transform: 'scaleX(-1)',
        }}
      />
      
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
          title="Turn off camera"
        >
          <svg 
            className="w-3 h-3 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
      
      <div 
        className="absolute inset-0 border-2 border-white/20 pointer-events-none"
        style={{ borderRadius: borderRadiusPixels }}
      />
    </div>
  );
}