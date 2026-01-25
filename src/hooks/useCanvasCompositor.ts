'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { CameraPosition } from '@/types';

interface CompositorConfig {
  fps: number;
  cameraPosition: CameraPosition;
  cameraSizeRatio: number;
  cameraBorderRadius: number;
  padding: number;
}

const DEFAULT_CONFIG: CompositorConfig = {
  fps: 30,
  cameraPosition: 'bottom-left',
  cameraSizeRatio: 0.25,
  cameraBorderRadius: 50,
  padding: 20,
};

export function useCanvasCompositor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const configRef = useRef<CompositorConfig>(DEFAULT_CONFIG);

  const [isCompositing, setIsCompositing] = useState(false);
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeElements = useCallback(() => {
    try {
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get 2D canvas context. Canvas may not be supported.');
        }
        
        ctxRef.current = ctx;
      }
      
      if (!screenVideoRef.current) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        screenVideoRef.current = video;
      }
      
      if (!cameraVideoRef.current) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        cameraVideoRef.current = video;
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Failed to initialize compositor: ${err.message}`
        : 'Failed to initialize compositor elements.';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const calculateCameraRect = useCallback((
    canvasWidth: number,
    canvasHeight: number,
    config: CompositorConfig
  ) => {
    const size = Math.round(canvasHeight * config.cameraSizeRatio);
    const padding = config.padding;
    
    let x: number;
    let y: number;
    
    switch (config.cameraPosition) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-right':
        x = canvasWidth - size - padding;
        y = padding;
        break;
      case 'bottom-left':
        x = padding;
        y = canvasHeight - size - padding;
        break;
      case 'bottom-right':
        x = canvasWidth - size - padding;
        y = canvasHeight - size - padding;
        break;
      default:
        x = padding;
        y = canvasHeight - size - padding;
    }
    
    return { x, y, size };
  }, []);

  const drawFrame = useCallback(() => {
    try {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      const screenVideo = screenVideoRef.current;
      const cameraVideo = cameraVideoRef.current;
      
      if (!ctx || !canvas || !screenVideo) {
        // Stop animation if elements are missing
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }
      
      // Check if video is ready
      if (screenVideo.readyState < 2) {
        // Video not ready yet, continue animation loop
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }
      
      const config = configRef.current;
      
      // Draw screen video
      try {
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.warn('Error drawing screen video:', err);
        // Continue anyway
      }
      
      // Draw camera overlay if available
      if (cameraVideo && cameraVideo.videoWidth > 0 && cameraVideo.readyState >= 2) {
        try {
          const { x, y, size } = calculateCameraRect(
            canvas.width,
            canvas.height,
            config
          );
          
          // Gradual border radius from 0 (square) to 100 (circle)
          // At 100%, borderRadius = size / 2 = perfect circle
          const borderRadiusPixels = (config.cameraBorderRadius / 100) * (size / 2);
          
          ctx.save();
          ctx.beginPath();
          
          if (borderRadiusPixels > 0) {
            ctx.roundRect(x, y, size, size, borderRadiusPixels);
          } else {
            ctx.rect(x, y, size, size);
          }
          
          ctx.clip();
          ctx.translate(x + size, y);
          ctx.scale(-1, 1);
          ctx.drawImage(cameraVideo, 0, 0, size, size);
          ctx.restore();
          
          // Draw border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          
          if (borderRadiusPixels > 0) {
            ctx.roundRect(x, y, size, size, borderRadiusPixels);
          } else {
            ctx.rect(x, y, size, size);
          }
          
          ctx.stroke();
        } catch (err) {
          console.warn('Error drawing camera overlay:', err);
          // Continue without camera overlay
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    } catch (err) {
      console.error('Error in drawFrame:', err);
      setError('Error rendering video frame. Recording may be affected.');
      // Stop animation on error
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [calculateCameraRect]);

  /**
   * Start compositing - NOW WITH AUDIO SUPPORT
   * 
   * @param screenStream - Screen capture stream
   * @param cameraStream - Camera stream (optional)
   * @param audioStream - Mixed audio stream (optional)
   * @param config - Compositor configuration
   */
  const startCompositing = useCallback((
    screenStream: MediaStream,
    cameraStream: MediaStream | null,
    audioStream: MediaStream | null,
    config: Partial<CompositorConfig> = {}
  ): MediaStream | null => {
    try {
      setError(null);
      
      // Check if screen stream has video tracks
      if (!screenStream || !screenStream.getVideoTracks().length) {
        setError('Screen stream does not have video tracks.');
        return null;
      }
      
      initializeElements();
      
      const canvas = canvasRef.current;
      const screenVideo = screenVideoRef.current;
      const cameraVideo = cameraVideoRef.current;
      const ctx = ctxRef.current;
      
      if (!canvas || !screenVideo || !ctx) {
        setError('Failed to initialize compositor elements.');
        return null;
      }
      
      configRef.current = { ...DEFAULT_CONFIG, ...config };
      
      // Get screen track settings
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        setError('Screen stream does not have a video track.');
        return null;
      }
      
      const settings = screenTrack.getSettings();
      
      // Validate dimensions
      const width = settings.width || 1920;
      const height = settings.height || 1080;
      
      if (width <= 0 || height <= 0) {
        setError('Invalid screen dimensions.');
        return null;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Handle video errors
      screenVideo.onerror = (err) => {
        setError('Error loading screen video.');
        console.error('Screen video error:', err);
      };
      
      cameraVideo?.addEventListener('error', (err) => {
        console.warn('Camera video error:', err);
        // Camera error is not critical, continue without it
      });
      
      // Handle track ending
      screenTrack.onended = () => {
        setError('Screen capture was disconnected.');
        // Use stopCompositing from closure, will be defined later
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (outputStreamRef.current) {
          outputStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {
              // Ignore
            }
          });
          outputStreamRef.current = null;
        }
        setOutputStream(null);
        setIsCompositing(false);
      };
      
      screenVideo.srcObject = screenStream;
      screenVideo.play().catch((err) => {
        setError('Failed to play screen video.');
        console.error('Screen video play error:', err);
      });
      
      if (cameraStream && cameraVideo) {
        // Check if camera stream has video tracks
        if (!cameraStream.getVideoTracks().length) {
          console.warn('Camera stream does not have video tracks.');
        } else {
          cameraVideo.srcObject = cameraStream;
          cameraVideo.play().catch((err) => {
            console.warn('Failed to play camera video:', err);
            // Camera error is not critical
          });
        }
      }
      
      screenVideo.onloadedmetadata = () => {
        try {
          drawFrame();
          
          // Check if captureStream is supported
          if (typeof canvas.captureStream !== 'function') {
            setError('Canvas captureStream is not supported in this browser.');
            return;
          }
          
          // Capture canvas as video-only stream
          const canvasStream = canvas.captureStream(configRef.current.fps);
          
          if (!canvasStream || !canvasStream.getVideoTracks().length) {
            setError('Failed to capture canvas stream.');
            return;
          }
          
          /**
           * Combine video + audio into final stream
           * 
           * MediaStream can contain multiple tracks.
           * We add the video track from canvas and audio track separately.
           */
          const combinedStream = new MediaStream();
          
          // Add video track from canvas
          canvasStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
            
            // Handle track ending (which can indicate errors)
            track.onended = () => {
              setError('Canvas video track was disconnected.');
              console.error('Canvas track ended unexpectedly');
            };
          });
          
          // Add audio tracks if available
          if (audioStream && audioStream.getAudioTracks().length > 0) {
            audioStream.getAudioTracks().forEach(track => {
              combinedStream.addTrack(track);
              
              // Handle audio track ending
              track.onended = () => {
                console.warn('Audio track ended unexpectedly');
                // Audio error is not critical
              };
            });
          }
          
          outputStreamRef.current = combinedStream;
          setOutputStream(combinedStream);
          setIsCompositing(true);
        } catch (err) {
          const errorMessage = err instanceof Error 
            ? `Failed to start compositing: ${err.message}`
            : 'Failed to start compositing.';
          setError(errorMessage);
          console.error('Compositing error:', err);
        }
      };
      
      return outputStreamRef.current;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Failed to start compositing: ${err.message}`
        : 'Failed to start compositing.';
      setError(errorMessage);
      console.error('Compositing initialization error:', err);
      return null;
    }
  }, [initializeElements, drawFrame]);

  const updateConfig = useCallback((config: Partial<CompositorConfig>) => {
    configRef.current = { ...configRef.current, ...config };
  }, []);

  /**
   * Update camera stream during recording
   * Call this when camera is toggled on/off while recording
   */
  const updateCameraStream = useCallback((cameraStream: MediaStream | null) => {
    const cameraVideo = cameraVideoRef.current;
    if (!cameraVideo) return;

    if (cameraStream && cameraStream.getVideoTracks().length > 0) {
      cameraVideo.srcObject = cameraStream;
      cameraVideo.play().catch((err) => {
        console.warn('Failed to play camera video:', err);
      });
    } else {
      cameraVideo.srcObject = null;
    }
  }, []);

  const stopCompositing = useCallback(() => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (outputStreamRef.current) {
        outputStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('Error stopping output track:', err);
          }
        });
        outputStreamRef.current = null;
      }
      
      if (screenVideoRef.current) {
        try {
          screenVideoRef.current.srcObject = null;
        } catch (err) {
          console.warn('Error clearing screen video:', err);
        }
      }
      if (cameraVideoRef.current) {
        try {
          cameraVideoRef.current.srcObject = null;
        } catch (err) {
          console.warn('Error clearing camera video:', err);
        }
      }
      
      setOutputStream(null);
      setIsCompositing(false);
      setError(null);
    } catch (err) {
      console.error('Error stopping compositor:', err);
    }
  }, []);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCompositing();
    };
  }, [stopCompositing]);

  return {
    startCompositing,
    stopCompositing,
    updateConfig,
    updateCameraStream,
    outputStream,
    isCompositing,
    error,
    clearError,
  };
}