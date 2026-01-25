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

  
  const initializeElements = useCallback(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      ctxRef.current = canvas.getContext('2d');
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
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const screenVideo = screenVideoRef.current;
    const cameraVideo = cameraVideoRef.current;
    
    if (!ctx || !canvas || !screenVideo) return;
    
    const config = configRef.current;
    
    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
    
    if (cameraVideo && cameraVideo.videoWidth > 0) {
      const { x, y, size } = calculateCameraRect(
        canvas.width,
        canvas.height,
        config
      );
      
      const borderRadiusPixels = (config.cameraBorderRadius / 100) * (size / 2);
      
      ctx.save();
      
      ctx.beginPath();
      
      if (config.cameraBorderRadius >= 50) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else if (config.cameraBorderRadius > 0) {
        ctx.roundRect(x, y, size, size, borderRadiusPixels);
      } else {
        ctx.rect(x, y, size, size);
      }
      
      ctx.clip();
      
      
      ctx.translate(x + size, y);
      ctx.scale(-1, 1);
      ctx.drawImage(cameraVideo, 0, 0, size, size);
      
      ctx.restore();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      if (config.cameraBorderRadius >= 50) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 2 - 1.5; 
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else if (config.cameraBorderRadius > 0) {
        ctx.roundRect(x, y, size, size, borderRadiusPixels);
      } else {
        ctx.rect(x, y, size, size);
      }
      
      ctx.stroke();
    }
    
    animationFrameRef.current = requestAnimationFrame(drawFrame);
  }, [calculateCameraRect]);

  const startCompositing = useCallback((
    screenStream: MediaStream,
    cameraStream: MediaStream | null,
    config: Partial<CompositorConfig> = {}
  ): MediaStream | null => {
    initializeElements();
    
    const canvas = canvasRef.current;
    const screenVideo = screenVideoRef.current;
    const cameraVideo = cameraVideoRef.current;
    
    if (!canvas || !screenVideo) {
      console.error('Failed to initialize compositor elements');
      return null;
    }
    
    configRef.current = { ...DEFAULT_CONFIG, ...config };
    
    const screenTrack = screenStream.getVideoTracks()[0];
    const settings = screenTrack.getSettings();
    
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;
    
    screenVideo.srcObject = screenStream;
    screenVideo.play().catch(console.error);
    
    if (cameraStream && cameraVideo) {
      cameraVideo.srcObject = cameraStream;
      cameraVideo.play().catch(console.error);
    }
    
    screenVideo.onloadedmetadata = () => {
      drawFrame();
      
      const combinedStream = canvas.captureStream(configRef.current.fps);
      
      outputStreamRef.current = combinedStream;
      setOutputStream(combinedStream);
      setIsCompositing(true);
    };
    
    return outputStreamRef.current;
  }, [initializeElements, drawFrame]);

  const updateConfig = useCallback((config: Partial<CompositorConfig>) => {
    configRef.current = { ...configRef.current, ...config };
  }, []);

  const stopCompositing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (outputStreamRef.current) {
      outputStreamRef.current.getTracks().forEach(track => track.stop());
      outputStreamRef.current = null;
    }
    
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    
    setOutputStream(null);
    setIsCompositing(false);
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
    outputStream,
    isCompositing,
  };
}