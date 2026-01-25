'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useRecorder } from '@/hooks/useRecorder';
import { useCamera } from '@/hooks/useCamera';
import { useAudio } from '@/hooks/useAudio';
import { useCanvasCompositor } from '@/hooks/useCanvasCompositor';
import { ScreenPreview } from '@/components/ScreenPreview';
import { PreviewModal } from '@/components/PreviewModal';
import { CameraOverlay } from '@/components/CameraOverlay';
import { CameraToggle } from '@/components/CameraToggle';
import { SettingsPanel } from '@/components/SettingsPanel';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Tooltip } from '@/components/Tooltip';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatTime } from '@/lib/formatTime';
import {
  CameraPosition,
  AudioSource,
  DEFAULT_CAMERA_SETTINGS,
  DEFAULT_RECORDING_SETTINGS
} from '@/types';

export default function Home() {
  // ============================================
  // HOOKS
  // ============================================

  const {
    screenStream,
    isSharing,
    hasSystemAudio,
    error: captureError,
    startCapture,
    stopCapture,
    clearError: clearCaptureError,
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
    clearError: clearRecordError,
  } = useRecorder();

  const {
    cameraStream,
    isCameraOn,
    isLoading: isCameraLoading,
    error: cameraError,
    toggleCamera,
    stopCamera,
    clearError: clearCameraError,
  } = useCamera();

  const {
    isMicrophoneOn,
    isLoading: isMicLoading,
    error: audioError,
    toggleMicrophone,
    setSystemAudio,
    getMixedAudioStream,
    cleanup: cleanupAudio,
    clearError: clearAudioError,
  } = useAudio();

  const {
    startCompositing,
    stopCompositing,
    updateConfig,
    updateCameraStream,
    outputStream,
    isCompositing,
    error: compositorError,
    clearError: clearCompositorError,
  } = useCanvasCompositor();

  // ============================================
  // SETTINGS STATE
  // ============================================

  // Camera settings
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(
    DEFAULT_CAMERA_SETTINGS.position
  );
  const [cameraSize, setCameraSize] = useState(DEFAULT_CAMERA_SETTINGS.size);
  const [cameraBorderRadius, setCameraBorderRadius] = useState(
    DEFAULT_CAMERA_SETTINGS.borderRadius
  );

  // Recording settings
  const [fps, setFps] = useState(DEFAULT_RECORDING_SETTINGS.fps);
  const [videoBitrate, setVideoBitrate] = useState(DEFAULT_RECORDING_SETTINGS.videoBitrate);

  // Audio settings
  const [audioSource, setAudioSource] = useState<AudioSource>(
    DEFAULT_RECORDING_SETTINGS.audioSource
  );

  // ============================================
  // DERIVED STATE
  // ============================================

  // Aggregate all errors
  const error = captureError || recordError || cameraError || audioError || compositorError;

  // Determine error source for better error handling
  const errorSource = captureError ? 'capture'
    : recordError ? 'recording'
      : cameraError ? 'camera'
        : audioError ? 'audio'
          : compositorError ? 'compositor'
            : null;

  const isRecordingActive = recordingState === 'recording' || recordingState === 'paused';
  const showPreview = recordingState === 'stopped' && recordedBlob !== null;

  // Clear all errors function
  const clearAllErrors = useCallback(() => {
    clearCaptureError();
    clearRecordError();
    clearCameraError();
    clearAudioError();
    clearCompositorError();
  }, [clearCaptureError, clearRecordError, clearCameraError, clearAudioError, clearCompositorError]);

  // Memoize expensive calculations
  // Allow camera size up to 55% of screen height (600/1080 ≈ 0.55)
  const sizeRatio = useMemo(() => {
    return Math.max(0.07, Math.min(0.55, cameraSize / 1080));
  }, [cameraSize]);

  // ============================================
  // EFFECTS
  // ============================================

  // Sync system audio from screen capture
  useEffect(() => {
    if (screenStream) {
      setSystemAudio(screenStream);
    }
  }, [screenStream, setSystemAudio]);

  // Update compositor config when settings change
  useEffect(() => {
    if (isCompositing) {
      updateConfig({
        cameraPosition,
        cameraSizeRatio: sizeRatio,
        cameraBorderRadius,
        fps,
      });
    }
  }, [cameraPosition, cameraSize, cameraBorderRadius, fps, isCompositing, updateConfig, sizeRatio]);

  // Start recording when output stream is ready
  useEffect(() => {
    if (outputStream && isCompositing && recordingState === 'idle') {
      startRecording(outputStream, videoBitrate);
    }
  }, [outputStream, isCompositing, recordingState, startRecording, videoBitrate]);

  // Stop compositor when recording stops
  useEffect(() => {
    if (recordingState === 'stopped' && isCompositing) {
      stopCompositing();
    }
  }, [recordingState, isCompositing, stopCompositing]);

  // Update camera stream in compositor when camera is toggled during recording
  useEffect(() => {
    if (isRecordingActive && isCompositing) {
      updateCameraStream(cameraStream);
    }
  }, [cameraStream, isRecordingActive, isCompositing, updateCameraStream]);

  // Sync audio source with microphone state (only before recording)
  useEffect(() => {
    if (!isRecordingActive) {
      if (isMicrophoneOn) {
        // If mic is on and audio source is 'none', switch to 'microphone'
        if (audioSource === 'none') {
          setAudioSource('microphone');
        }
      } else {
        // If mic is off and audio source uses mic, switch appropriately
        if (audioSource === 'microphone') {
          setAudioSource('none');
        } else if (audioSource === 'both') {
          // If both was selected but mic turned off, switch to system only
          setAudioSource(hasSystemAudio ? 'system' : 'none');
        }
      }
    }
  }, [isMicrophoneOn, isRecordingActive, audioSource, hasSystemAudio]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleStartSharing = useCallback(async () => {
    // Always request audio so browser shows "Share tab audio" option
    // User can choose to use it or not based on their audio source selection
    await startCapture({
      withAudio: true
    });
  }, [startCapture]);

  /**
   * Start recording with all streams combined
   */
  const handleStartRecording = useCallback(() => {
    if (!screenStream) {
      clearAllErrors();
      // This shouldn't happen, but handle gracefully
      return;
    }

    try {
      // Clear previous errors
      clearAllErrors();

      // Get mixed audio stream based on selection
      const audioStream = getMixedAudioStream(audioSource);

      // Start compositing screen + camera + audio
      const result = startCompositing(
        screenStream,
        cameraStream,
        audioStream,
        {
          fps,
          cameraPosition,
          cameraSizeRatio: sizeRatio,
          cameraBorderRadius,
          padding: 20,
        }
      );

      // If compositing failed, show error
      if (!result && compositorError) {
        // Error is already set by the hook
        console.error('Failed to start compositing');
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      // Error handling is done by hooks
    }
  }, [
    screenStream,
    cameraStream,
    cameraPosition,
    cameraSize,
    cameraBorderRadius,
    fps,
    audioSource,
    getMixedAudioStream,
    startCompositing,
    sizeRatio,
    clearAllErrors,
    compositorError,
  ]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleStopSharing = useCallback(() => {
    if (isRecordingActive) {
      stopRecording();
    }
    stopCompositing();
    stopCapture();
    stopCamera();
    cleanupAudio();
  }, [isRecordingActive, stopRecording, stopCompositing, stopCapture, stopCamera, cleanupAudio]);

  const handleDiscard = useCallback(() => {
    discardRecording();
  }, [discardRecording]);

  const handleDownloaded = useCallback(() => {
    discardRecording();
  }, [discardRecording]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useKeyboardShortcuts({
    onToggleRecording: isSharing && recordingState === 'idle'
      ? handleStartRecording
      : isRecordingActive
        ? handleStopRecording
        : undefined,
    onTogglePause: isRecordingActive
      ? (recordingState === 'recording' ? pauseRecording : resumeRecording)
      : undefined,
    onStopSharing: isSharing ? handleStopSharing : undefined,
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getAudioStatusText = () => {
    if (audioSource === 'none') return 'No audio';
    if (audioSource === 'microphone' && isMicrophoneOn) return 'Mic';
    if (audioSource === 'system' && hasSystemAudio) return 'System';
    if (audioSource === 'both' && isMicrophoneOn && hasSystemAudio) return 'Mic+System';
    return 'No audio';
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Screen Recorder
          </h1>
          <p className="text-sm text-muted-foreground">
            Simple and minimal screen recording
          </p>
        </div>

        {/* Screen Preview */}
        <div className="mb-4 relative flex items-center justify-center">
          <div className="relative w-full max-w-4xl">
            <ScreenPreview stream={screenStream} />

            {/* Camera Overlay Preview - show during preview and recording */}
            {isSharing && isCameraOn && cameraStream && (
              <CameraOverlay
                stream={cameraStream}
                position={cameraPosition}
                size={cameraSize}
                borderRadius={cameraBorderRadius}
              />
            )}

            {recordingState === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
                <span className="w-3 h-3 bg-recording rounded-full animate-pulse-recording" />
                <span className="text-white text-sm font-medium">
                  REC {formatTime(duration)}
                </span>
              </div>
            )}

            {recordingState === 'paused' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
                <span className="w-3 h-3 bg-muted-foreground rounded-full" />
                <span className="text-white text-sm font-medium">
                  PAUSED {formatTime(duration)}
                </span>
              </div>
            )}

            {/* Quality/Audio badge */}
            {isRecordingActive && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs">
                {fps}fps • {videoBitrate}Mbps • {getAudioStatusText()}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4">
            <ErrorDisplay
              error={error}
              onRetry={
                errorSource === 'camera'
                  ? () => {
                    clearCameraError();
                    toggleCamera();
                  }
                  : errorSource === 'audio'
                    ? () => {
                      clearAudioError();
                      toggleMicrophone();
                    }
                    : errorSource === 'capture'
                      ? () => {
                        clearCaptureError();
                        handleStartSharing();
                      }
                      : errorSource === 'recording'
                        ? () => {
                          clearRecordError();
                          if (isSharing && recordingState === 'idle') {
                            handleStartRecording();
                          }
                        }
                        : errorSource === 'compositor'
                          ? () => {
                            clearCompositorError();
                            if (isSharing && recordingState === 'idle') {
                              handleStartRecording();
                            }
                          }
                          : undefined
              }
              onDismiss={clearAllErrors}
            />
          </div>
        )}

        {/* Loading state when starting recording */}
        {isCompositing && recordingState === 'idle' && (
          <div className="mb-4 flex justify-center">
            <LoadingSpinner text="Preparing recording..." size="md" />
          </div>
        )}

        {/* Camera & Mic Toggles - Only show before recording */}
        {isSharing && !isRecordingActive && (
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <CameraToggle
              isOn={isCameraOn}
              isLoading={isCameraLoading}
              onToggle={toggleCamera}
            />
            {/* Microphone Toggle */}
            <Tooltip content={isMicrophoneOn ? 'Turn off microphone' : 'Turn on microphone'}>
              <button
                onClick={toggleMicrophone}
                disabled={isMicLoading}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${isMicrophoneOn
                    ? 'bg-accent text-black hover:bg-accent-hover'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                  }
                  ${isMicLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isMicLoading ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
                <span className="text-sm">
                  {isMicLoading ? 'Loading...' : isMicrophoneOn ? 'Mic On' : 'Mic Off'}
                </span>
              </button>
            </Tooltip>
          </div>
        )}

        {/* Settings Panel - Full settings before recording, camera-only during recording */}
        {isSharing && (
          <div className="mb-6">
            <SettingsPanel
              // Camera
              cameraEnabled={isCameraOn}
              cameraPosition={cameraPosition}
              cameraSize={cameraSize}
              cameraBorderRadius={cameraBorderRadius}
              onCameraPositionChange={setCameraPosition}
              onCameraSizeChange={setCameraSize}
              onCameraBorderRadiusChange={setCameraBorderRadius}
              // Recording
              fps={fps}
              videoBitrate={videoBitrate}
              onFpsChange={setFps}
              onVideoBitrateChange={setVideoBitrate}
              // Audio
              audioSource={audioSource}
              onAudioSourceChange={setAudioSource}
              isMicrophoneOn={isMicrophoneOn}
              hasSystemAudio={hasSystemAudio}
              // Mode
              isRecording={isRecordingActive}
            />
          </div>
        )}

        {/* Main Controls */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">

          {!isSharing && recordingState === 'idle' && (
            <Tooltip content="Start sharing your screen">
              <button
                onClick={handleStartSharing}
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-black font-medium rounded-lg transition-colors"
              >
                Share Screen
              </button>
            </Tooltip>
          )}

          {isSharing && recordingState === 'idle' && (
            <>
              <Tooltip content="Start recording (Ctrl+Shift+R)">
                <button
                  onClick={handleStartRecording}
                  className="px-6 py-3 bg-recording hover:bg-muted-foreground text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="w-3 h-3 bg-black rounded-full" />
                  Start Recording
                </button>
              </Tooltip>
              <Tooltip content="Stop sharing (Esc)">
                <button
                  onClick={handleStopSharing}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
                >
                  Stop Sharing
                </button>
              </Tooltip>
            </>
          )}

          {recordingState === 'recording' && (
            <>
              <Tooltip content="Pause recording (Space)">
                <button
                  onClick={pauseRecording}
                  className="px-6 py-3 bg-muted-foreground hover:bg-muted-foreground/80 text-white font-medium rounded-lg transition-colors"
                >
                  Pause
                </button>
              </Tooltip>
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Stop Recording
              </button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <Tooltip content="Resume recording (Space)">
                <button
                  onClick={resumeRecording}
                  className="px-6 py-3 bg-recording hover:bg-muted-foreground text-black font-medium rounded-lg transition-colors"
                >
                  Resume
                </button>
              </Tooltip>
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Stop Recording
              </button>
            </>
          )}
        </div>

        {/* Status - Enhanced */}
        <div className="mt-6 text-center space-y-2">
          {isSharing && recordingState === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                Ready: {fps}fps, {videoBitrate}Mbps
                {isCameraOn && ' • Camera'}
                {audioSource !== 'none' && ` • Audio: ${getAudioStatusText()}`}
              </p>
              {/* {!isCameraOn && audioSource === 'none' && (
                <p className="text-xs text-muted-foreground/70">
                  💡 Enable camera or audio to enhance your recording
                </p>
              )} */}
              <p className="text-xs text-muted-foreground/70">
                💡 Press <kbd className="px-1.5 py-0.5 bg-muted text-foreground rounded text-xs">Ctrl+Shift+R</kbd> to start recording
              </p>
            </>
          )}

          {isRecordingActive && (
            <p className="text-sm text-muted-foreground">
              Recording at {fps}fps • {videoBitrate}Mbps
              {isCameraOn && ' • Camera included'}
              {audioSource !== 'none' && ` • ${getAudioStatusText()}`}
            </p>
          )}
        </div>

        {/* Help Section - Collapsible */}
        {/* {!isSharing && (
          <details className="mt-8 p-4 bg-card rounded-lg border border-border">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How to use
            </summary>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Getting Started:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click "Share Screen" and select what to record</li>
                  <li>Optionally enable camera and microphone</li>
                  <li>Adjust settings (FPS, quality, camera position)</li>
                  <li>Click "Start Recording"</li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">Keyboard Shortcuts:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><kbd className="px-1.5 py-0.5 bg-muted text-foreground rounded text-xs">Ctrl+Shift+R</kbd> - Start/Stop recording</li>
                  <li><kbd className="px-1.5 py-0.5 bg-muted text-foreground rounded text-xs">Space</kbd> - Pause/Resume</li>
                  <li><kbd className="px-1.5 py-0.5 bg-muted text-foreground rounded text-xs">Esc</kbd> - Stop sharing</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>For system audio, share a browser tab and check "Share tab audio"</li>
                  <li>Higher bitrate = better quality but larger files</li>
                  <li>60fps is great for gaming, 30fps for most content</li>
                </ul>
              </div>
            </div>
          </details>
        )} */}
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