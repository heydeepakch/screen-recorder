'use client';

import { useState, useCallback } from 'react';

interface ScreenCaptureOptions {

  withAudio?: boolean;
}


export function useScreenCapture() {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  const startCapture = useCallback(async (options: ScreenCaptureOptions = {}) => {
    try {
      setError(null);
      
    
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          
        },
        // Request audio if specified
        audio: options.withAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } : false,
      });
      
      // Check if we got audio
      const audioTracks = stream.getAudioTracks();
      setHasSystemAudio(audioTracks.length > 0);
      
      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setIsSharing(false);
        setHasSystemAudio(false);
      };
      
      setScreenStream(stream);
      setIsSharing(true);
      
      return stream;
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(null); // User cancelled - not an error
        } else {
          setError(err.message);
        }
      }
      setIsSharing(false);
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharing(false);
      setHasSystemAudio(false);
    }
  }, [screenStream]);

  return {
    screenStream,
    isSharing,
    error,
    hasSystemAudio,
    startCapture,
    stopCapture,
  };
}