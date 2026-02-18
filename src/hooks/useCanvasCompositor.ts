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

  // Timer-based fallback refs
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityCleanupRef = useRef<(() => void) | null>(null);

  // Insertable Streams primary path refs
  const pipelineAbortRef = useRef<AbortController | null>(null);
  const usingInsertableStreamsRef = useRef(false);

  const outputStreamRef = useRef<MediaStream | null>(null);
  const configRef = useRef<CompositorConfig>(DEFAULT_CONFIG);
  const lockReleaseRef = useRef<(() => void) | null>(null);

  const [isCompositing, setIsCompositing] = useState(false);
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeElements = useCallback(() => {
    try {
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D canvas context. Canvas may not be supported.');
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
      const msg = err instanceof Error
        ? `Failed to initialize compositor: ${err.message}`
        : 'Failed to initialize compositor elements.';
      setError(msg);
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
    let x: number, y: number;
    switch (config.cameraPosition) {
      case 'top-left':     x = padding;                         y = padding;                          break;
      case 'top-right':    x = canvasWidth - size - padding;    y = padding;                          break;
      case 'bottom-left':  x = padding;                         y = canvasHeight - size - padding;    break;
      case 'bottom-right': x = canvasWidth - size - padding;    y = canvasHeight - size - padding;    break;
      default:             x = padding;                         y = canvasHeight - size - padding;
    }
    return { x, y, size };
  }, []);

  /**
   * Draw camera overlay onto the given context.
   * Used by both the Insertable Streams path and the timer-based fallback.
   */
  const applyCameraOverlay = useCallback((
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const cameraVideo = cameraVideoRef.current;
    if (!cameraVideo || cameraVideo.videoWidth === 0 || cameraVideo.readyState < 2) return;

    const config = configRef.current;
    const { x, y, size } = calculateCameraRect(canvasWidth, canvasHeight, config);

    // Cover crop: fill the square without stretching
    const camW = cameraVideo.videoWidth;
    const camH = cameraVideo.videoHeight;
    const scale = Math.max(size / camW, size / camH);
    const sourceSize = size / scale;
    const sx = (camW - sourceSize) / 2;
    const sy = (camH - sourceSize) / 2;

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
    ctx.drawImage(cameraVideo, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (borderRadiusPixels > 0) {
      ctx.roundRect(x, y, size, size, borderRadiusPixels);
    } else {
      ctx.rect(x, y, size, size);
    }
    ctx.stroke();
  }, [calculateCameraRect]);

  // ─────────────────────────────────────────────
  // FALLBACK: timer-based draw loop
  // Used when Insertable Streams API is unavailable.
  // rAF runs at full FPS when tab is visible; setInterval keeps
  // things ticking (at browser-throttled rate) when tab is hidden.
  // ─────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    try {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      const screenVideo = screenVideoRef.current;

      if (!ctx || !canvas || !screenVideo) {
        if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }

      if (screenVideo.readyState < 2) {
        if (!document.hidden) animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      applyCameraOverlay(ctx, canvas.width, canvas.height);

      // Switch between rAF (visible) and setInterval (hidden)
      if (document.hidden) {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(drawFrame, 1000 / configRef.current.fps);
        }
      } else {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        animationFrameRef.current = requestAnimationFrame(drawFrame);
      }
    } catch (err) {
      console.error('Error in drawFrame:', err);
      setError('Error rendering video frame. Recording may be affected.');
      if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
  }, [applyCameraOverlay]);

  const startCompositing = useCallback((
    screenStream: MediaStream,
    cameraStream: MediaStream | null,
    audioStream: MediaStream | null,
    config: Partial<CompositorConfig> = {}
  ): MediaStream | null => {
    try {
      setError(null);

      if (!screenStream?.getVideoTracks().length) {
        setError('Screen stream does not have video tracks.');
        return null;
      }

      initializeElements();

      const canvas = canvasRef.current!;
      const ctx = ctxRef.current!;
      const screenVideo = screenVideoRef.current!;
      const cameraVideo = cameraVideoRef.current;

      configRef.current = { ...DEFAULT_CONFIG, ...config };

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        setError('Screen stream does not have a video track.');
        return null;
      }

      const settings = screenTrack.getSettings();
      const width = settings.width || 1920;
      const height = settings.height || 1080;
      if (width <= 0 || height <= 0) {
        setError('Invalid screen dimensions.');
        return null;
      }
      canvas.width = width;
      canvas.height = height;

      // Setup camera video element (used by both paths)
      if (cameraStream && cameraVideo) {
        if (cameraStream.getVideoTracks().length) {
          cameraVideo.srcObject = cameraStream;
          cameraVideo.play().catch(err => console.warn('Camera play error:', err));
        }
      }

      // Enforce the requested FPS on the screen capture track.
      // getDisplayMedia may have been called with a different (or no) frameRate,
      // so we apply the constraint here before the pipeline starts.
      screenTrack.applyConstraints({
        frameRate: { ideal: configRef.current.fps, max: configRef.current.fps },
      }).catch(() => {
        // applyConstraints is best-effort — some browsers/OS combinations ignore it
      });

      // Acquire Web Lock to suppress intensive background throttling (Chrome 88+)
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        navigator.locks.request('screen-recorder-lock', () =>
          new Promise<void>(resolve => { lockReleaseRef.current = resolve; })
        ).catch(() => {});
      }

      // ─────────────────────────────────────────────────────────────────────
      // PRIMARY PATH: Insertable Streams
      //
      // MediaStreamTrackProcessor reads VideoFrames directly from the screen
      // capture track. This stream is driven by the source (not a JS timer),
      // so it continues at full rate even when our tab is hidden.
      // MediaStreamTrackGenerator (or VideoTrackGenerator) receives the
      // composited frames and acts as a normal MediaStreamTrack for recording.
      // ─────────────────────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = (typeof window !== 'undefined' ? window : undefined) as any;
      type ProcessorCtor = new (init: { track: MediaStreamTrack }) => { readable: ReadableStream<VideoFrame> };
      type GeneratorCtor = new (init: { kind: string }) => MediaStreamTrack & { writable: WritableStream<VideoFrame> };
      const ProcessorClass: ProcessorCtor | undefined = w?.MediaStreamTrackProcessor;
      const GeneratorClass: GeneratorCtor | undefined = w?.VideoTrackGenerator ?? w?.MediaStreamTrackGenerator;

      if (ProcessorClass && GeneratorClass) {
        try {
          const processor = new ProcessorClass({ track: screenTrack });
          const generator = new GeneratorClass({ kind: 'video' });

          const abortController = new AbortController();
          pipelineAbortRef.current = abortController;
          usingInsertableStreamsRef.current = true;

          // Frame-dropping: only pass through frames that meet the target FPS.
          // VideoFrame timestamps are in microseconds.
          let lastEnqueuedTimestamp = -Infinity;

          const transformer = new TransformStream<VideoFrame, VideoFrame>({
            transform(frame, controller) {
              try {
                const targetIntervalUs = 1_000_000 / configRef.current.fps;
                const elapsed = frame.timestamp - lastEnqueuedTimestamp;

                if (elapsed < targetIntervalUs) {
                  // Drop this frame — source is delivering faster than target FPS
                  return;
                }

                lastEnqueuedTimestamp = frame.timestamp;

                // Draw screen frame
                ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
                // Composite camera overlay
                applyCameraOverlay(ctx, canvas.width, canvas.height);
                // Output new frame with matching timestamp
                const out = new VideoFrame(canvas, {
                  timestamp: frame.timestamp,
                  alpha: 'discard',
                });
                controller.enqueue(out);
              } finally {
                frame.close();
              }
            },
          });

          processor.readable
            .pipeThrough(transformer)
            .pipeTo(generator.writable, { signal: abortController.signal })
            .catch((err: Error) => {
              if (err.name !== 'AbortError') {
                console.error('Compositor pipeline error:', err);
                setError('Recording pipeline error. Please restart recording.');
              }
            });

          screenTrack.onended = () => {
            abortController.abort();
            setError('Screen capture was disconnected.');
            outputStreamRef.current = null;
            setOutputStream(null);
            setIsCompositing(false);
          };

          const combinedStream = new MediaStream();
          combinedStream.addTrack(generator);
          if (audioStream?.getAudioTracks().length) {
            audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
          }

          outputStreamRef.current = combinedStream;
          setOutputStream(combinedStream);
          setIsCompositing(true);
          return combinedStream;
        } catch (err) {
          // InsertableStreams setup failed – fall through to timer-based approach
          console.warn('Insertable Streams failed, falling back to timer-based compositing:', err);
          pipelineAbortRef.current = null;
          usingInsertableStreamsRef.current = false;
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // FALLBACK PATH: timer-based canvas loop + captureStream
      // ─────────────────────────────────────────────────────────────────────
      usingInsertableStreamsRef.current = false;

      screenVideo.onerror = () => {
        setError('Error loading screen video.');
      };

      screenTrack.onended = () => {
        setError('Screen capture was disconnected.');
        if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        visibilityCleanupRef.current?.();
        visibilityCleanupRef.current = null;
        outputStreamRef.current = null;
        setOutputStream(null);
        setIsCompositing(false);
      };

      screenVideo.srcObject = screenStream;
      screenVideo.play().catch(err => {
        setError('Failed to play screen video.');
        console.error('Screen video play error:', err);
      });

      // Switch between rAF (visible tab) and setInterval (hidden tab)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
          const compositingActive = outputStreamRef.current || screenVideo.srcObject;
          if (!intervalRef.current && compositingActive) {
            intervalRef.current = setInterval(drawFrame, 1000 / configRef.current.fps);
          }
        } else {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          if ((outputStreamRef.current || screenVideo.srcObject) && !animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(drawFrame);
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityCleanupRef.current = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };

      screenVideo.onloadedmetadata = () => {
        try {
          drawFrame();

          if (typeof canvas.captureStream !== 'function') {
            setError('Canvas captureStream is not supported in this browser.');
            return;
          }

          const canvasStream = canvas.captureStream(configRef.current.fps);
          if (!canvasStream?.getVideoTracks().length) {
            setError('Failed to capture canvas stream.');
            return;
          }

          const combinedStream = new MediaStream();
          canvasStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
            track.onended = () => {
              setError('Canvas video track was disconnected.');
            };
          });
          if (audioStream?.getAudioTracks().length) {
            audioStream.getAudioTracks().forEach(track => {
              combinedStream.addTrack(track);
              track.onended = () => console.warn('Audio track ended unexpectedly');
            });
          }

          outputStreamRef.current = combinedStream;
          setOutputStream(combinedStream);
          setIsCompositing(true);
        } catch (err) {
          const msg = err instanceof Error ? `Failed to start compositing: ${err.message}` : 'Failed to start compositing.';
          setError(msg);
        }
      };

      return outputStreamRef.current;
    } catch (err) {
      const msg = err instanceof Error ? `Failed to start compositing: ${err.message}` : 'Failed to start compositing.';
      setError(msg);
      return null;
    }
  }, [initializeElements, drawFrame, applyCameraOverlay]);

  const updateConfig = useCallback((config: Partial<CompositorConfig>) => {
    configRef.current = { ...configRef.current, ...config };
  }, []);

  const updateCameraStream = useCallback((cameraStream: MediaStream | null) => {
    const cameraVideo = cameraVideoRef.current;
    if (!cameraVideo) return;
    if (cameraStream?.getVideoTracks().length) {
      cameraVideo.srcObject = cameraStream;
      cameraVideo.play().catch(err => console.warn('Failed to play camera video:', err));
    } else {
      cameraVideo.srcObject = null;
    }
  }, []);

  const stopCompositing = useCallback(() => {
    try {
      // Stop Insertable Streams pipeline
      if (pipelineAbortRef.current) {
        pipelineAbortRef.current.abort();
        pipelineAbortRef.current = null;
      }

      // Stop timer-based fallback
      if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      visibilityCleanupRef.current?.();
      visibilityCleanupRef.current = null;

      // Release Web Lock
      lockReleaseRef.current?.();
      lockReleaseRef.current = null;

      if (outputStreamRef.current) {
        outputStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch { /* ignore */ }
        });
        outputStreamRef.current = null;
      }

      if (screenVideoRef.current) {
        try { screenVideoRef.current.srcObject = null; } catch { /* ignore */ }
      }
      if (cameraVideoRef.current) {
        try { cameraVideoRef.current.srcObject = null; } catch { /* ignore */ }
      }

      usingInsertableStreamsRef.current = false;
      setOutputStream(null);
      setIsCompositing(false);
      setError(null);
    } catch (err) {
      console.error('Error stopping compositor:', err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => { stopCompositing(); };
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
