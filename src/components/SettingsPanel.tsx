'use client';

import { CameraPosition, AudioSource } from '@/types';

interface SettingsPanelProps {
  // Camera settings
  cameraEnabled: boolean;
  cameraPosition: CameraPosition;
  cameraSize: number;
  cameraBorderRadius: number;
  onCameraPositionChange: (position: CameraPosition) => void;
  onCameraSizeChange: (size: number) => void;
  onCameraBorderRadiusChange: (radius: number) => void;
  
  // Recording settings
  fps: number;
  videoBitrate: number;
  onFpsChange: (fps: number) => void;
  onVideoBitrateChange: (bitrate: number) => void;
  
  // Audio settings (NEW)
  audioSource: AudioSource;
  onAudioSourceChange: (source: AudioSource) => void;
  isMicrophoneOn: boolean;
  hasSystemAudio: boolean;
}

const FPS_OPTIONS = [
  { value: 24, label: '24 FPS', description: 'Cinematic' },
  { value: 30, label: '30 FPS', description: 'Standard' },
  { value: 60, label: '60 FPS', description: 'Smooth' },
];

/**
 * Audio source options with descriptions
 */
const AUDIO_OPTIONS: { value: AudioSource; label: string; icon: string }[] = [
  { value: 'none', label: 'No Audio', icon: '🔇' },
  { value: 'microphone', label: 'Microphone', icon: '🎤' },
  { value: 'system', label: 'System', icon: '🔊' },
  { value: 'both', label: 'Both', icon: '🎚️' },
];

export function SettingsPanel({
  cameraEnabled,
  cameraPosition,
  cameraSize,
  cameraBorderRadius,
  onCameraPositionChange,
  onCameraSizeChange,
  onCameraBorderRadiusChange,
  fps,
  videoBitrate,
  onFpsChange,
  onVideoBitrateChange,
  audioSource,
  onAudioSourceChange,
  isMicrophoneOn,
  hasSystemAudio,
}: SettingsPanelProps) {
  
  const estimatedSizePerMinute = (videoBitrate * 60 / 8).toFixed(1);

  return (
    <div className="p-4 bg-card rounded-lg border border-border space-y-6">
      
      {/* Recording Quality Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 012 2v12a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2m0 0V2m5 0v2m5-2v2m0 0a2 2 0 012 2v12a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2" />
          </svg>
          Recording Quality
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FPS Selection */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Frame Rate
            </label>
            <div className="flex gap-2">
              {FPS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFpsChange(option.value)}
                  className={`
                    flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${fps === option.value
                      ? 'bg-accent text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {FPS_OPTIONS.find(o => o.value === fps)?.description}
            </p>
          </div>
          
          {/* Bitrate Selection */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Quality: {videoBitrate} Mbps
            </label>
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={videoBitrate}
              onChange={(e) => onVideoBitrateChange(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>~{estimatedSizePerMinute} MB/min</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Audio Section (NEW) */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Audio Source
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUDIO_OPTIONS.map((option) => {
            // Determine if option is available
            const isDisabled = 
              (option.value === 'microphone' && !isMicrophoneOn) ||
              (option.value === 'system' && !hasSystemAudio) ||
              (option.value === 'both' && (!isMicrophoneOn || !hasSystemAudio));
            
            return (
              <button
                key={option.value}
                onClick={() => !isDisabled && onAudioSourceChange(option.value)}
                disabled={isDisabled}
                className={`
                  py-2 px-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1
                  ${audioSource === option.value
                    ? 'bg-accent text-white'
                    : isDisabled
                      ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                <span className="text-lg">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Audio status hints */}
        <div className="mt-2 space-y-1">
          {!isMicrophoneOn && audioSource !== 'none' && audioSource !== 'system' && (
            <p className="text-xs text-yellow-500">
              ⚠️ Turn on microphone above to use mic audio
            </p>
          )}
          {!hasSystemAudio && (audioSource === 'system' || audioSource === 'both') && (
            <p className="text-xs text-yellow-500">
              ⚠️ Share a browser tab with "Share tab audio" checked to capture system audio
            </p>
          )}
          {audioSource !== 'none' && (
            <p className="text-xs text-muted-foreground">
              {audioSource === 'microphone' && isMicrophoneOn && '✓ Microphone will be recorded'}
              {audioSource === 'system' && hasSystemAudio && '✓ System audio will be recorded'}
              {audioSource === 'both' && isMicrophoneOn && hasSystemAudio && '✓ Mic + System audio will be mixed'}
            </p>
          )}
        </div>
      </div>

      {/* Camera Settings Section */}
      {cameraEnabled && <div className="border-t border-border" />}

      {cameraEnabled && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Camera Overlay
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Position
              </label>
              <select
                value={cameraPosition}
                onChange={(e) => onCameraPositionChange(e.target.value as CameraPosition)}
                className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Size: {cameraSize}px
              </label>
              <input
                type="range"
                min="100"
                max="400"
                value={cameraSize}
                onChange={(e) => onCameraSizeChange(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Roundness: {cameraBorderRadius}%
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={cameraBorderRadius}
                onChange={(e) => onCameraBorderRadiusChange(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}