'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
    
export function useCamera() {
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  
  const startCamera = useCallback(async () => {
    
    if (isCameraOn) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      
      setCameraStream(stream);
      setIsCameraOn(true);
      
    } catch (err) {
    
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application.');
        } else {
          setError(err.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isCameraOn]);

  
  const stopCamera = useCallback(() => {
    if (cameraStream) {
    
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraOn(false);
    }
  }, [cameraStream]);

  
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  }, [isCameraOn, startCamera, stopCamera]);

  
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  
  return {
    cameraStream,   
    isCameraOn,     
    isLoading,      
    error,          
    startCamera,    
    stopCamera,     
    toggleCamera,   
  };
}