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

    // Audio settings
    audioSource: AudioSource;
    onAudioSourceChange: (source: AudioSource) => void;
    isMicrophoneOn: boolean;
    hasSystemAudio: boolean;
}

const FPS_OPTIONS = [
    { value: 24, label: '24 FPS - Cinematic' },
    { value: 30, label: '30 FPS - Standard' },
    { value: 60, label: '60 FPS - Smooth' },
];

const BITRATE_OPTIONS = [
    { value: 1, label: '1 Mbps - Low quality, small files' },
    { value: 2, label: '2 Mbps - Medium quality' },
    { value: 4, label: '4 Mbps - Good quality (recommended)' },
    { value: 8, label: '8 Mbps - High quality' },
    { value: 16, label: '16 Mbps - Very high quality, large files' },
];

const AUDIO_OPTIONS: { value: AudioSource; label: string }[] = [
    { value: 'none', label: 'No Audio' },
    { value: 'microphone', label: 'Microphone' },
    { value: 'system', label: 'System Audio' },
    { value: 'both', label: 'Both (Mic + System)' },
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

            {/* Recording Settings - All in one row */}
            <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2a2 2 0 012 2v12a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2m0 0V2m5 0v2m5-2v2m0 0a2 2 0 012 2v12a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2" />
                    </svg>
                    Recording Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* FPS Selection - Dropdown */}
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Frame Rate
                        </label>
                        <select
                            value={fps}
                            onChange={(e) => onFpsChange(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                        >
                            {FPS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bitrate Selection - Dropdown */}
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Quality
                        </label>
                        <select
                            value={videoBitrate}
                            onChange={(e) => onVideoBitrateChange(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                        >
                            {BITRATE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            ~{estimatedSizePerMinute} MB/min
                        </p>
                    </div>

                    {/* Audio Selection - Dropdown */}
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Audio Source
                        </label>
                        <select
                            value={audioSource}
                            onChange={(e) => onAudioSourceChange(e.target.value as AudioSource)}
                            className="w-full px-3 py-2 bg-muted rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                        >
                            {AUDIO_OPTIONS.map((option) => {
                                // Determine if option is available
                                const isDisabled =
                                    (option.value === 'microphone' && !isMicrophoneOn) ||
                                    (option.value === 'system' && !hasSystemAudio) ||
                                    (option.value === 'both' && (!isMicrophoneOn || !hasSystemAudio));

                                return (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                        disabled={isDisabled}
                                    >
                                        {option.label}
                                        {isDisabled && ' (Not available)'}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
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
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Camera Overlay
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Position - 2x2 Grid */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-3">
                                Position
                            </label>
                            <div className="grid grid-cols-2 gap-2 w-fit">
                                {/* Top Left */}
                                <button
                                    onClick={() => onCameraPositionChange('top-left')}
                                    className={`
                                        w-20 h-12 rounded-lg transition-all
                                        ${cameraPosition === 'top-left'
                                            ? 'bg-muted-foreground/30 border-2 border-accent'
                                            : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                        }
                                    `}
                                    aria-label="Top Left"
                                />
                                {/* Top Right */}
                                <button
                                    onClick={() => onCameraPositionChange('top-right')}
                                    className={`
                                        w-20 h-12 rounded-lg transition-all
                                        ${cameraPosition === 'top-right'
                                            ? 'bg-muted-foreground/30 border-2 border-accent'
                                            : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                        }
                                    `}
                                    aria-label="Top Right"
                                />
                                {/* Bottom Left */}
                                <button
                                    onClick={() => onCameraPositionChange('bottom-left')}
                                    className={`
                                        w-20 h-12 rounded-lg transition-all
                                        ${cameraPosition === 'bottom-left'
                                            ? 'bg-muted-foreground/30 border-2 border-accent'
                                            : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                        }
                                    `}
                                    aria-label="Bottom Left"
                                />
                                {/* Bottom Right */}
                                <button
                                    onClick={() => onCameraPositionChange('bottom-right')}
                                    className={`
                                        w-20 h-12 rounded-lg transition-all
                                        ${cameraPosition === 'bottom-right'
                                            ? 'bg-muted-foreground/30 border-2 border-accent'
                                            : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                                        }
                                    `}
                                    aria-label="Bottom Right"
                                />
                            </div>
                        </div>

                        {/* Size and Roundness Controls */}
                        <div className="space-y-6">
                            {/* Size Slider */}
                            <div>
                                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                                    Size: {Math.round((cameraSize / 1080) * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="100"
                                    max="400"
                                    value={cameraSize}
                                    onChange={(e) => onCameraSizeChange(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>

                            {/* Roundness Slider */}
                            <div>
                                <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                                    Roundness: {cameraBorderRadius}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={cameraBorderRadius}
                                    onChange={(e) => onCameraBorderRadiusChange(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}