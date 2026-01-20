'use client';

import { useEffect, useRef } from 'react';

interface ScreenPreviewProps {
  
  stream: MediaStream | null;
}

export function ScreenPreview({ stream }: ScreenPreviewProps) {
  
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

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
      {stream ? (
       
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      ) : (
       
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <svg
            className="w-16 h-16 mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">No screen shared</p>
          <p className="text-xs mt-1 opacity-70">Click "Share Screen" to begin</p>
        </div>
      )}
    </div>
  );
}