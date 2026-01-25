'use client';

import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useRecorder } from '@/hooks/useRecorder';
import { ScreenPreview } from '@/components/ScreenPreview';
import { PreviewModal } from '@/components/PreviewModal';
import { formatTime } from '@/lib/formatTime';

export default function Home() {
  // Screen capture hook
  const { 
    screenStream, 
    isSharing, 
    error: captureError, 
    startCapture, 
    stopCapture 
  } = useScreenCapture();
  
  // Recording hook
  const {
    recordingState,
    recordedBlob,
    duration,
    error: recordError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  } = useRecorder();


  const error = captureError || recordError;
  

  const isRecordingActive = recordingState === 'recording' || recordingState === 'paused';
  
 
  const showPreview = recordingState === 'stopped' && recordedBlob !== null;

  const handleStartRecording = () => {
    if (screenStream) {
      startRecording(screenStream, 4); // 4 Mbps
    }
  };

  const handleStopSharing = () => {
    if (isRecordingActive) {
      stopRecording();
    }
    stopCapture();
  };

  const handleDiscard = () => {
    discardRecording();
    
  };

  const handleDownloaded = () => {
    discardRecording();
   
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Screen Recorder
          </h1>
          <p className="text-muted-foreground">
            Simple and minimal screen recording
          </p>
        </div>

        {/* Screen Preview */}
        <div className="mb-6 relative">
          <ScreenPreview stream={screenStream} />
          
          {/* Recording indicator overlay */}
          {recordingState === 'recording' && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
              <span className="w-3 h-3 bg-recording rounded-full animate-pulse-recording" />
              <span className="text-white text-sm font-medium">
                REC {formatTime(duration)}
              </span>
            </div>
          )}
          
          {/* Paused indicator */}
          {recordingState === 'paused' && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
              <span className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-white text-sm font-medium">
                PAUSED {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            Error: {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          
          {/* Not sharing yet */}
          {!isSharing && recordingState === 'idle' && (
            <button
              onClick={startCapture}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
            >
              Share Screen
            </button>
          )}
          
          {/* Sharing but not recording */}
          {isSharing && recordingState === 'idle' && (
            <>
              <button
                onClick={handleStartRecording}
                className="px-6 py-3 bg-recording hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-full" />
                Start Recording
              </button>
              <button
                onClick={handleStopSharing}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Stop Sharing
              </button>
            </>
          )}
          
          {/* Currently recording */}
          {recordingState === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
              >
                Pause
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Stop Recording
              </button>
            </>
          )}
          
          {/* Recording paused */}
          {recordingState === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="px-6 py-3 bg-recording hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Resume
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Stop Recording
              </button>
            </>
          )}
        </div>

        {/* Status info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSharing && recordingState === 'idle' && (
            <p>Screen sharing active. Click "Start Recording" to begin.</p>
          )}
        </div>
      </div>

     
      {showPreview && recordedBlob && (
        <PreviewModal
          blob={recordedBlob}
          duration={duration}
          onDiscard={handleDiscard}
          onDownloaded={handleDownloaded}
        />
      )}
    </main>
  );
}