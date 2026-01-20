'use client';

import { useScreenCapture } from '@/hooks/useScreenCapture';
import { ScreenPreview } from '@/components/ScreenPreview';

export default function Home() {
  
  const { screenStream, isSharing, error, startCapture, stopCapture } = useScreenCapture();

  return (
    <main className="min-h-screen bg-background p-8">
      
      <div className="max-w-4xl mx-auto">
        
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Screen Recorder
          </h1>
          <p className="text-muted-foreground">
            Simple and minimal screen recording
          </p>
        </div>

        
        <div className="mb-6">
          <ScreenPreview stream={screenStream} />
        </div>

        
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            Error: {error}
          </div>
        )}

       
        <div className="flex justify-center gap-4">
          {!isSharing ? (
           
            <button
              onClick={startCapture}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
            >
              Share Screen
            </button>
          ) : (
            
            <button
              onClick={stopCapture}
              className="px-6 py-3 bg-destructive hover:bg-destructive-hover text-white font-medium rounded-lg transition-colors"
            >
              Stop Sharing
            </button>
          )}
        </div>

       
        {isSharing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Screen sharing active
          </div>
        )}
      </div>
    </main>
  );
}