'use client';

import { useState, useEffect, useCallback } from 'react';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useRecorder } from '@/hooks/useRecorder';
import { useCamera } from '@/hooks/useCamera';
import { useCanvasCompositor } from '@/hooks/useCanvasCompositor';
import { ScreenPreview } from '@/components/ScreenPreview';
import { PreviewModal } from '@/components/PreviewModal';
import { CameraOverlay } from '@/components/CameraOverlay';
import { CameraToggle } from '@/components/CameraToggle';
import { formatTime } from '@/lib/formatTime';
import { CameraPosition, DEFAULT_CAMERA_SETTINGS } from '@/types';

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

  const {
    cameraStream,
    isCameraOn,
    isLoading: isCameraLoading,
    error: cameraError,
    toggleCamera,
    stopCamera,
  } = useCamera();

  const {
    startCompositing,
    stopCompositing,
    updateConfig,
    outputStream,
    isCompositing,
  } = useCanvasCompositor();

  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(
    DEFAULT_CAMERA_SETTINGS.position
  );
  const [cameraSize, setCameraSize] = useState(DEFAULT_CAMERA_SETTINGS.size);
  const [cameraBorderRadius, setCameraBorderRadius] = useState(
    DEFAULT_CAMERA_SETTINGS.borderRadius
  );

  const error = captureError || recordError || cameraError;
  const isRecordingActive = recordingState === 'recording' || recordingState === 'paused';
  const showPreview = recordingState === 'stopped' && recordedBlob !== null;

  useEffect(() => {
    if (isCompositing) {
      const sizeRatio = cameraSize / 1080;
      
      updateConfig({
        cameraPosition,
        cameraSizeRatio: Math.max(0.1, Math.min(0.4, sizeRatio)),
        cameraBorderRadius,
      });
    }
  }, [cameraPosition, cameraSize, cameraBorderRadius, isCompositing, updateConfig]);

  
  const handleStartRecording = useCallback(() => {
    if (!screenStream) return;
    
    const sizeRatio = cameraSize / 1080;
    
    startCompositing(screenStream, cameraStream, {
      fps: 30,
      cameraPosition,
      cameraSizeRatio: Math.max(0.1, Math.min(0.4, sizeRatio)),
      cameraBorderRadius,
      padding: 20,
    });
    
  }, [screenStream, cameraStream, cameraPosition, cameraSize, cameraBorderRadius, startCompositing]);

  useEffect(() => {
    if (outputStream && isCompositing && recordingState === 'idle') {
      startRecording(outputStream, 4);
    }
  }, [outputStream, isCompositing, recordingState, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    if (recordingState === 'stopped' && isCompositing) {
      stopCompositing();
    }
  }, [recordingState, isCompositing, stopCompositing]);

  const handleStopSharing = () => {
    if (isRecordingActive) {
      stopRecording();
    }
    stopCompositing();
    stopCapture();
    stopCamera();
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

        {/* Screen Preview with Camera Overlay */}
        <div className="mb-6 relative">
          <ScreenPreview stream={screenStream} />
          
          {/* Camera Overlay Preview (for visual feedback before recording) */}
          {isSharing && !isRecordingActive && (
            <CameraOverlay
              stream={cameraStream}
              position={cameraPosition}
              size={cameraSize}
              borderRadius={cameraBorderRadius}
              onClose={stopCamera}
            />
          )}
          
          {/* During recording, show indicator that camera is being composited */}
          {isRecordingActive && isCameraOn && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Camera recording
            </div>
          )}
          
          {/* Recording indicator */}
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

        {/* Camera Toggle */}
        {isSharing && recordingState !== 'stopped' && (
          <div className="mb-4 flex justify-center">
            <CameraToggle
              isOn={isCameraOn}
              isLoading={isCameraLoading}
              onToggle={toggleCamera}
            />
          </div>
        )}

        {/* Camera Settings */}
        {isSharing && isCameraOn && !isRecordingActive && (
          <div className="mb-6 p-4 bg-card rounded-lg border border-border">
            <h3 className="text-sm font-medium mb-3">Camera Settings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Position */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Position
                </label>
                <select
                  value={cameraPosition}
                  onChange={(e) => setCameraPosition(e.target.value as CameraPosition)}
                  className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
              
              {/* Size */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Size: {cameraSize}px
                </label>
                <input
                  type="range"
                  min="100"
                  max="400"
                  value={cameraSize}
                  onChange={(e) => setCameraSize(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
              
              {/* Roundness */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Roundness: {cameraBorderRadius}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={cameraBorderRadius}
                  onChange={(e) => setCameraBorderRadius(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Controls */}
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
                onClick={handleStopRecording}
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
                onClick={handleStopRecording}
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
            <p>
              Screen sharing active. 
              {isCameraOn 
                ? ' Camera will be included in the recording!' 
                : ' Toggle camera to add face overlay.'}
            </p>
          )}
          {isRecordingActive && isCameraOn && (
            <p className="text-green-500">
              ✓ Camera overlay is being recorded with the screen
            </p>
          )}
        </div>
      </div>

      {/* Preview Modal */}
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