'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioSource } from '@/types';

interface AudioState {
  microphoneStream: MediaStream | null;
  systemAudioStream: MediaStream | null;
  mixedAudioStream: MediaStream | null;
}

export function useAudio() {
  
  const [audioState, setAudioState] = useState<AudioState>({
    microphoneStream: null,
    systemAudioStream: null,
    mixedAudioStream: null,
  });
  
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const systemSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const getAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        // Check if AudioContext is supported
        if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
          throw new Error('Web Audio API is not supported in this browser.');
        }
        
        audioContextRef.current = new (AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume if suspended (browsers require user interaction to start audio)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch((err) => {
          console.warn('Failed to resume AudioContext:', err);
          setError('Audio context could not be started. Please interact with the page first.');
        });
      }
      
      return audioContextRef.current;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create audio context.';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // ============================================
  // START MICROPHONE
  // ============================================
  
  const startMicrophone = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone access is not supported in this browser.');
        return null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Check if stream has audio tracks
      if (!stream.getAudioTracks().length) {
        setError('No audio track available from microphone.');
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      
      // Handle track ending (which can indicate errors)
      stream.getAudioTracks()[0].onended = () => {
        setError('Microphone was disconnected.');
        stopMicrophone();
      };
      
      setAudioState(prev => ({
        ...prev,
        microphoneStream: stream,
      }));
      setIsMicrophoneOn(true);
      
      return stream;
      
    } catch (err) {
      let errorMessage = 'Failed to access microphone.';
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            break;
            
          case 'NotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone device.';
            break;
            
          case 'NotReadableError':
            errorMessage = 'Microphone is in use by another application. Please close other apps using the microphone.';
            break;
            
          case 'OverconstrainedError':
            errorMessage = 'Microphone constraints cannot be satisfied.';
            break;
            
          case 'TypeError':
            errorMessage = 'Microphone access is not supported in this browser or context.';
            break;
            
          case 'AbortError':
            errorMessage = 'Microphone access was aborted.';
            break;
            
          default:
            errorMessage = err.message || 'An unknown error occurred while accessing the microphone.';
        }
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // STOP MICROPHONE
  // ============================================
  
  const stopMicrophone = useCallback(() => {
    if (audioState.microphoneStream) {
      audioState.microphoneStream.getTracks().forEach(track => track.stop());
      setAudioState(prev => ({
        ...prev,
        microphoneStream: null,
      }));
    }
    setIsMicrophoneOn(false);
  }, [audioState.microphoneStream]);

  // ============================================
  // TOGGLE MICROPHONE
  // ============================================
  
  const toggleMicrophone = useCallback(async () => {
    if (isMicrophoneOn) {
      stopMicrophone();
    } else {
      await startMicrophone();
    }
  }, [isMicrophoneOn, startMicrophone, stopMicrophone]);

  // ============================================
  // SET SYSTEM AUDIO (from screen share)
  // ============================================
  
 
  const setSystemAudio = useCallback((stream: MediaStream | null) => {
    // Check if stream has audio tracks
    if (stream && stream.getAudioTracks().length > 0) {
      // Extract only the audio track
      const audioTrack = stream.getAudioTracks()[0];
      const audioOnlyStream = new MediaStream([audioTrack]);
      
      setAudioState(prev => ({
        ...prev,
        systemAudioStream: audioOnlyStream,
      }));
    } else {
      setAudioState(prev => ({
        ...prev,
        systemAudioStream: null,
      }));
    }
  }, []);

  // ============================================
  // MIX AUDIO SOURCES
  // ============================================
  

  const getMixedAudioStream = useCallback((
    audioSource: AudioSource
  ): MediaStream | null => {
    // No audio requested
    if (audioSource === 'none') {
      return null;
    }
    
    const { microphoneStream, systemAudioStream } = audioState;
    
    // Check what's available
    const hasMic = microphoneStream && microphoneStream.getAudioTracks().length > 0;
    const hasSystem = systemAudioStream && systemAudioStream.getAudioTracks().length > 0;
    
    // Only microphone requested/available
    if (audioSource === 'microphone') {
      return hasMic ? microphoneStream : null;
    }
    
    // Only system audio requested
    if (audioSource === 'system') {
      return hasSystem ? systemAudioStream : null;
    }
    
    // Both requested
    if (audioSource === 'both') {
      // If only one is available, return that
      if (hasMic && !hasSystem) return microphoneStream;
      if (hasSystem && !hasMic) return systemAudioStream;
      
      // If both available, mix them
      if (hasMic && hasSystem) {
        return mixAudioStreams(microphoneStream!, systemAudioStream!);
      }
      
      return null;
    }
    
    return null;
  }, [audioState]);

  // ============================================
  // MIX TWO AUDIO STREAMS
  // ============================================
  
  const mixAudioStreams = useCallback((
    stream1: MediaStream,
    stream2: MediaStream
  ): MediaStream => {
    try {
      const audioCtx = getAudioContext();
      
      // Disconnect previous sources if they exist
      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch (err) {
          // Already disconnected, ignore
        }
      }
      if (systemSourceRef.current) {
        try {
          systemSourceRef.current.disconnect();
        } catch (err) {
          // Already disconnected, ignore
        }
      }
      
      if (!destinationRef.current) {
        destinationRef.current = audioCtx.createMediaStreamDestination();
      }
      
      // Check if streams have audio tracks
      if (!stream1.getAudioTracks().length || !stream2.getAudioTracks().length) {
        throw new Error('One or both audio streams do not have audio tracks.');
      }
      
      const source1 = audioCtx.createMediaStreamSource(stream1);
      const source2 = audioCtx.createMediaStreamSource(stream2);
      
      // Store refs for cleanup
      micSourceRef.current = source1;
      systemSourceRef.current = source2;
      
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      gain1.gain.value = 1.0;  // Mic volume
      gain2.gain.value = 0.8;  // System audio slightly lower
    
      source1.connect(gain1);
      gain1.connect(destinationRef.current);
      
      source2.connect(gain2);
      gain2.connect(destinationRef.current);
      
      // Return the mixed stream
      return destinationRef.current.stream;
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? `Failed to mix audio: ${err.message}` 
        : 'Failed to mix audio streams.';
      setError(errorMessage);
      throw err;
    }
  }, [getAudioContext]);

  // ============================================
  // CLEANUP
  // ============================================
  
  const cleanup = useCallback(() => {
    try {
      // Stop microphone
      if (audioState.microphoneStream) {
        audioState.microphoneStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('Error stopping microphone track:', err);
          }
        });
      }
      
      // Disconnect audio nodes
      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch (err) {
          // Already disconnected, ignore
        }
        micSourceRef.current = null;
      }
      if (systemSourceRef.current) {
        try {
          systemSourceRef.current.disconnect();
        } catch (err) {
          // Already disconnected, ignore
        }
        systemSourceRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.warn('Error closing AudioContext:', err);
        }
        audioContextRef.current = null;
      }
      
      destinationRef.current = null;
      
      setAudioState({
        microphoneStream: null,
        systemAudioStream: null,
        mixedAudioStream: null,
      });
      setIsMicrophoneOn(false);
      setError(null);
    } catch (err) {
      console.error('Error during audio cleanup:', err);
    }
  }, [audioState.microphoneStream]);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // ============================================
  // RETURN
  // ============================================
  
  return {
    // State
    microphoneStream: audioState.microphoneStream,
    systemAudioStream: audioState.systemAudioStream,
    isMicrophoneOn,
    isLoading,
    error,
    hasSystemAudio: audioState.systemAudioStream !== null,
    
    // Actions
    startMicrophone,
    stopMicrophone,
    toggleMicrophone,
    setSystemAudio,
    getMixedAudioStream,
    cleanup,
    clearError,
  };
}