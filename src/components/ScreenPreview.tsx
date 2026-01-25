'use client';

import { useEffect, useRef, useState } from 'react';

interface ScreenPreviewProps {
  stream: MediaStream | null;
}

export function ScreenPreview({ stream }: ScreenPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video && stream) {
      video.srcObject = stream;

      // Update aspect ratio when video metadata loads
      const handleLoadedMetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setAspectRatio(video.videoWidth / video.videoHeight);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      // If already loaded
      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        if (video) {
          video.srcObject = null;
        }
      };
    } else {
      setAspectRatio(null);
    }
  }, [stream]);

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-muted"
      style={{
        aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
        maxHeight: '450px',
      }}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted rounded-lg">
          <svg
            className="w-12 h-12 mb-3 opacity-50"
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