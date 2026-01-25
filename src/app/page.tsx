'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { formatTime } from '@/lib/formatTime';
import { 
  CameraPosition, 
  AudioSource,
  DEFAULT_CAMERA_SETTINGS, 
  DEFAULT_RECORDING_SETTINGS 
} from '@/types';

export default function Home() {

  const { 
    screenStream, 
    isSharing, 
    hasSystemAudio,
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
    isMicrophoneOn,
    isLoading: isMicLoading,
    error: audioError,
    toggleMicrophone,
    setSystemAudio,
    getMixedAudioStream,
    cleanup: cleanupAudio,
  } = useAudio();

  const {
    startCompositing,
    stopCompositing,
    updateConfig,
    outputStream,
    isCompositing,
  } = useCanvasCompositor();

  
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

 
  useEffect(() => {
    if (screenStream) {
      setSystemAudio(screenStream);
    }
  }, [screenStream, setSystemAudio]);


  const error = captureError || recordError || cameraError || audioError;
  const isRecordingActive = recordingState === 'recording' || recordingState === 'paused';
  const showPreview = recordingState === 'stopped' && recordedBlob !== null;


  useEffect(() => {
    if (isCompositing) {
      const sizeRatio = cameraSize / 1080;
      updateConfig({
        cameraPosition,
        cameraSizeRatio: Math.max(0.1, Math.min(0.4, sizeRatio)),
        cameraBorderRadius,
        fps,
      });
    }
  }, [cameraPosition, cameraSize, cameraBorderRadius, fps, isCompositing, updateConfig]);



  const handleStartSharing = useCallback(async () => {
    // Request screen with audio if user wants system audio
    await startCapture({ 
      withAudio: audioSource === 'system' || audioSource === 'both' 
    });
  }, [startCapture, audioSource]);


  const handleStartRecording = useCallback(() => {
    if (!screenStream) return;
    
    const sizeRatio = cameraSize / 1080;
    
    // Get mixed audio stream based on selection
    const audioStream = getMixedAudioStream(audioSource);
    
    // Start compositing screen + camera + audio
    startCompositing(
      screenStream, 
      cameraStream, 
      audioStream,  // Pass audio stream
      {
        fps,
        cameraPosition,
        cameraSizeRatio: Math.max(0.1, Math.min(0.4, sizeRatio)),
        cameraBorderRadius,
        padding: 20,
      }
    );
  }, [
    screenStream, 
    cameraStream, 
    cameraPosition, 
    cameraSize, 
    cameraBorderRadius, 
    fps, 
    audioSource,
    getMixedAudioStream,
    startCompositing
  ]);

  // Start recording when output stream is ready
  useEffect(() => {
    if (outputStream && isCompositing && recordingState === 'idle') {
      startRecording(outputStream, videoBitrate);
    }
  }, [outputStream, isCompositing, recordingState, startRecording, videoBitrate]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Stop compositor when recording stops
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
    cleanupAudio();
  };

  const handleDiscard = () => {
    discardRecording();
  };

  const handleDownloaded = () => {
    discardRecording();
  };

  // ============================================
  // AUDIO INDICATOR TEXT
  // ============================================
  
  const getAudioStatusText = () => {
    if (audioSource === 'none') return 'No audio';
    if (audioSource === 'microphone' && isMicrophoneOn) return 'Mic';
    if (audioSource === 'system' && hasSystemAudio) return 'System';
    if (audioSource === 'both' && isMicrophoneOn && hasSystemAudio) return 'Mic+System';
    return 'No audio';
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
          
          {/* Camera Overlay Preview */}
          {isSharing && !isRecordingActive && (
            <CameraOverlay
              stream={cameraStream}
              position={cameraPosition}
              size={cameraSize}
              borderRadius={cameraBorderRadius}
              onClose={stopCamera}
            />
          )}
          
          {/* Recording indicators */}
          {isRecordingActive && isCameraOn && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Camera recording
            </div>
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
              <span className="w-3 h-3 bg-yellow-500 rounded-full" />
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

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            Error: {error}
          </div>
        )}

        {/* Camera & Mic Toggles */}
        {isSharing && recordingState !== 'stopped' && (
          <div className="mb-4 flex justify-center gap-3">
            <CameraToggle
              isOn={isCameraOn}
              isLoading={isCameraLoading}
              onToggle={toggleCamera}
            />
            {/* Microphone Toggle */}
            <button
              onClick={toggleMicrophone}
              disabled={isMicLoading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${isMicrophoneOn 
                  ? 'bg-accent text-white hover:bg-accent-hover' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
          </div>
        )}

        {/* Settings Panel */}
        {isSharing && !isRecordingActive && (
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
            />
          </div>
        )}

        {/* Main Controls */}
        <div className="flex justify-center gap-3">
          
          {!isSharing && recordingState === 'idle' && (
            <button
              onClick={handleStartSharing}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
            >
              Share Screen
            </button>
          )}
          
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

        {/* Status */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSharing && recordingState === 'idle' && (
            <p>
              Ready: {fps}fps, {videoBitrate}Mbps
              {isCameraOn && ' • Camera'}
              {audioSource !== 'none' && ` • Audio: ${getAudioStatusText()}`}
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