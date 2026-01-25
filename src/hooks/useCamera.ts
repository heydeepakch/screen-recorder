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
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      
      // Check if stream has video tracks
      if (!stream.getVideoTracks().length) {
        setError('No video track available from camera.');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Handle track ending (which can indicate errors)
      stream.getVideoTracks()[0].onended = () => {
        setError('Camera was disconnected.');
        stopCamera();
      };
      
      setCameraStream(stream);
      setIsCameraOn(true);
      
    } catch (err) {
      let errorMessage = 'Failed to access camera.';
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
            break;
            
          case 'NotFoundError':
            errorMessage = 'No camera found. Please connect a camera device.';
            break;
            
          case 'NotReadableError':
            errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
            break;
            
          case 'OverconstrainedError':
            errorMessage = 'Camera constraints cannot be satisfied. Your camera may not support the requested settings.';
            break;
            
          case 'TypeError':
            errorMessage = 'Camera access is not supported in this browser or context.';
            break;
            
          case 'AbortError':
            errorMessage = 'Camera access was aborted.';
            break;
            
          default:
            errorMessage = err.message || 'An unknown error occurred while accessing the camera.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isCameraOn]);

  
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            // Track may already be stopped, ignore error
            console.warn('Error stopping camera track:', err);
          }
        });
      } catch (err) {
        console.error('Error stopping camera:', err);
      } finally {
        setCameraStream(null);
        setIsCameraOn(false);
        setError(null);
      }
    }
  }, [cameraStream]);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  
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
    clearError,
  };
}