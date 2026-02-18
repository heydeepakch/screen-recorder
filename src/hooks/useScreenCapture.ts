'use client';

import { useState, useCallback } from 'react';

interface ScreenCaptureOptions {
  withAudio?: boolean;
  frameRate?: number;
}

export function useScreenCapture() {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  const startCapture = useCallback(async (options: ScreenCaptureOptions = {}) => {
    try {
      setError(null);
      
      // Check if browser supports screen capture
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError('Screen capture is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.');
        return null;
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: options.frameRate
          ? { frameRate: { ideal: options.frameRate, max: options.frameRate } }
          : true,
        audio: options.withAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } : false,
      });
      
      // Check if stream has video tracks
      if (!stream.getVideoTracks().length) {
        setError('No video track available in the screen capture.');
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      
      // Check if we got audio
      const audioTracks = stream.getAudioTracks();
      setHasSystemAudio(audioTracks.length > 0);
      
      // Handle user stopping share via browser UI
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        setScreenStream(null);
        setIsSharing(false);
        setHasSystemAudio(false);
        setError(null);
      };
      
      // Handle track ending (which can indicate errors)
      videoTrack.onended = () => {
        setError('Screen capture was disconnected.');
        setScreenStream(null);
        setIsSharing(false);
        setHasSystemAudio(false);
      };
      
      setScreenStream(stream);
      setIsSharing(true);
      
      return stream;
      
    } catch (err) {
      let errorMessage = 'Failed to start screen capture.';
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            // User cancelled or denied - not really an error
            setError(null);
            setIsSharing(false);
            return null;
            
          case 'NotFoundError':
            errorMessage = 'No screen capture source available.';
            break;
            
          case 'NotReadableError':
            errorMessage = 'Screen capture source is not readable. It may be in use by another application.';
            break;
            
          case 'OverconstrainedError':
            errorMessage = 'Screen capture constraints cannot be satisfied.';
            break;
            
          case 'TypeError':
            errorMessage = 'Screen capture is not supported in this browser or context.';
            break;
            
          case 'AbortError':
            errorMessage = 'Screen capture was aborted.';
            break;
            
          default:
            errorMessage = err.message || 'An unknown error occurred while starting screen capture.';
        }
      }
      
      setError(errorMessage);
      setIsSharing(false);
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (screenStream) {
      try {
        screenStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            // Track may already be stopped, ignore error
            console.warn('Error stopping track:', err);
          }
        });
      } catch (err) {
        console.error('Error stopping screen capture:', err);
      } finally {
        setScreenStream(null);
        setIsSharing(false);
        setHasSystemAudio(false);
        setError(null);
      }
    }
  }, [screenStream]);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    screenStream,
    isSharing,
    error,
    hasSystemAudio,
    startCapture,
    stopCapture,
    clearError,
  };
}