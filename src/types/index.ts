
export type CameraPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export type AudioSource = 'none' | 'microphone' | 'system' | 'both';

export type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'stopped';

export interface CameraSettings {
  enabled: boolean;
 
  position: CameraPosition;
  
  size: number;
  
  borderRadius: number;
}

export interface RecordingSettings {
  
  fps: number;
  
  videoBitrate: number;
  
  
  audioSource: AudioSource;
}


export interface RecorderConfig {
  camera: CameraSettings;
  recording: RecordingSettings;
}


export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  enabled: true,
  position: 'bottom-left',
  size: 250,          // 250px base size (range: 80-600, scaled based on video height)
  borderRadius: 100,  // 100 = Perfect circle, 0 = square corners (range: 0-100)
};

export const DEFAULT_RECORDING_SETTINGS: RecordingSettings = {
  fps: 30,
  videoBitrate: 4,    // 4 Mbps - good quality, reasonable file size
  audioSource: 'microphone',
};

export const DEFAULT_CONFIG: RecorderConfig = {
  camera: DEFAULT_CAMERA_SETTINGS,
  recording: DEFAULT_RECORDING_SETTINGS,
};