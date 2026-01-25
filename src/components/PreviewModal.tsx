'use client';

import { useEffect, useRef, useState } from 'react';
import { formatTime } from '@/lib/formatTime';
import { downloadBlob, generateFilename } from '@/lib/downloadBlob';

interface PreviewModalProps {

  blob: Blob;

  duration: number;

  onDiscard: () => void;

  onDownloaded?: () => void;
}

export function PreviewModal({ blob, duration, onDiscard, onDownloaded }: PreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);


    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleDownload = () => {
    setIsDownloading(true);


    const filename = generateFilename('webm');


    downloadBlob(blob, filename);


    setTimeout(() => {
      setIsDownloading(false);
      onDownloaded?.();
    }, 500);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">

      {/* Modal content */}
      <div className="w-full max-w-3xl bg-card rounded-xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Recording Preview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review your recording before downloading
          </p>
        </div>

        {/* Video Preview */}
        <div className="bg-black">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full max-h-[400px] object-contain"
              playsInline
            />
          )}
        </div>

        {/* File Info */}
        <div className="px-6 py-4 bg-muted/30 border-t border-b border-border">
          <div className="flex justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">{formatTime(duration)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">File Size</div>
              <div className="font-medium">{formatFileSize(blob.size)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Format</div>
              <div className="font-medium">WebM</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onDiscard}
            className="px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-5 py-2.5 bg-success hover:bg-muted-foreground text-black font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}