'use client';

import { useState, useCallback, useRef } from 'react';

export function useScreenCapture() {
  
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  const [isSharing, setIsSharing] = useState(false);
  

  const [error, setError] = useState<string | null>(null);

  const startCapture = useCallback(async () => {
    try {
     
      setError(null);
     
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            
        },
        audio: false, 
      });
      
     
      stream.getVideoTracks()[0].onended = () => {
        
        setScreenStream(null);
        setIsSharing(false);
      };
      
     
      setScreenStream(stream);
      setIsSharing(true);
      
    } catch (err) {
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          
          setError(null);
        } else {
          setError(err.message);
        }
      }
      setIsSharing(false);
    }
  }, []);

  
  const stopCapture = useCallback(() => {
    if (screenStream) {
      
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsSharing(false);
    }
  }, [screenStream]);

  return {
    screenStream,   
    isSharing,     
    error,         
    startCapture,  
    stopCapture,   
  };
}