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
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // ============================================
  // START MICROPHONE
  // ============================================
  
  const startMicrophone = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      setAudioState(prev => ({
        ...prev,
        microphoneStream: stream,
      }));
      setIsMicrophoneOn(true);
      
      return stream;
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found.');
        } else {
          setError(err.message);
        }
      }
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
    const audioCtx = getAudioContext();
    
    // Disconnect previous sources if they exist
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
    }
    if (systemSourceRef.current) {
      systemSourceRef.current.disconnect();
    }
    
 
    if (!destinationRef.current) {
      destinationRef.current = audioCtx.createMediaStreamDestination();
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
  }, [getAudioContext]);

  // ============================================
  // CLEANUP
  // ============================================
  
  const cleanup = useCallback(() => {
    // Stop microphone
    if (audioState.microphoneStream) {
      audioState.microphoneStream.getTracks().forEach(track => track.stop());
    }
    
    // Disconnect audio nodes
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (systemSourceRef.current) {
      systemSourceRef.current.disconnect();
      systemSourceRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    destinationRef.current = null;
    
    setAudioState({
      microphoneStream: null,
      systemAudioStream: null,
      mixedAudioStream: null,
    });
    setIsMicrophoneOn(false);
  }, [audioState.microphoneStream]);

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
  };
}