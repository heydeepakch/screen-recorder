'use client';

import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useRecorder } from '@/hooks/useRecorder';
import { ScreenPreview } from '@/components/ScreenPreview';
import { formatTime } from '@/lib/formatTime';

export default function Home() {
 
  const { 
    screenStream, 
    isSharing, 
    error: captureError, 
    startCapture, 
    stopCapture 
  } = useScreenCapture();
  

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


  const handleStartRecording = () => {
    if (screenStream) {
      startRecording(screenStream, 4);
    }
  };

  const handleStopSharing = () => {
    if (isRecordingActive) {
      stopRecording();
    }
    stopCapture();
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
          
          {/* Recording stopped - show result info */}
          {recordingState === 'stopped' && recordedBlob && (
            <>
              <button
                onClick={discardRecording}
                className="px-6 py-3 bg-destructive hover:bg-destructive-hover text-white font-medium rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  // We'll add download in Phase 5
                  console.log('Download - coming in Phase 5!');
                  console.log('Blob size:', (recordedBlob.size / 1024 / 1024).toFixed(2), 'MB');
                }}
                className="px-6 py-3 bg-success hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Download
              </button>
            </>
          )}
        </div>

        {/* Status info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSharing && recordingState === 'idle' && (
            <p>Screen sharing active. Click "Start Recording" to begin.</p>
          )}
          
          {recordingState === 'stopped' && recordedBlob && (
            <p>
              Recording complete! Size: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB | 
              Duration: {formatTime(duration)}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}