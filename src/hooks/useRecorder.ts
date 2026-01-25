'use client';

import { useState, useCallback, useRef } from 'react';
import { RecordingState } from '@/types';


export function useRecorder() {
  
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  
 
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
 
  const [duration, setDuration] = useState(0);
  
  
  const [error, setError] = useState<string | null>(null);

  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const chunksRef = useRef<Blob[]>([]);
 
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getSupportedMimeType = (): string => {
    const types = [
      'video/webm;codecs=vp9,opus', 
      'video/webm;codecs=vp8,opus',  
      'video/webm;codecs=vp9',     
      'video/webm;codecs=vp8',     
      'video/webm',                 
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'video/webm'; 
  };

  
  const startTimer = () => {
   
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
  
    setDuration(0);
    
 
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resumeTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const startRecording = useCallback((stream: MediaStream, videoBitrate: number = 4) => {
    try {
      setError(null);
      
      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === 'undefined') {
        setError('MediaRecorder is not supported in this browser. Please use a modern browser.');
        setRecordingState('idle');
        return;
      }
      
      // Check if stream has tracks
      if (!stream.getTracks().length) {
        setError('No tracks available in the stream to record.');
        setRecordingState('idle');
        return;
      }
      
      // Clear previous recording data
      chunksRef.current = [];
      setRecordedBlob(null);
      
      // Get the best supported MIME type
      const mimeType = getSupportedMimeType();
      
      // Check if MIME type is supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        setError(`Video format ${mimeType} is not supported in this browser.`);
        setRecordingState('idle');
        return;
      }
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: videoBitrate * 1_000_000,
        });
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotSupportedError') {
            setError('Recording with these settings is not supported. Try adjusting quality or FPS.');
          } else {
            setError(`Failed to create MediaRecorder: ${err.message}`);
          }
        } else {
          setError('Failed to create MediaRecorder.');
        }
        setRecordingState('idle');
        return;
      }
      
      // Handle data available
      recorder.ondataavailable = (event) => {
        try {
          // Only save if there's actual data
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        } catch (err) {
          console.error('Error handling recording data:', err);
          setError('Error saving recording data. Recording may be incomplete.');
        }
      };
      
      // Handle recording stop
      recorder.onstop = () => {
        try {
          // Check if we have any chunks
          if (chunksRef.current.length === 0) {
            setError('No recording data was captured. The recording may have failed.');
            setRecordingState('idle');
            stopTimer();
            return;
          }
          
          // Combine all chunks into a single Blob
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Check if blob is valid
          if (blob.size === 0) {
            setError('Recording produced an empty file.');
            setRecordingState('idle');
            stopTimer();
            return;
          }
          
          setRecordedBlob(blob);
          setRecordingState('stopped');
          stopTimer();
        } catch (err) {
          console.error('Error processing recording:', err);
          setError('Error processing the recording. Please try again.');
          setRecordingState('idle');
          stopTimer();
        }
      };
      
      // Handle recording errors
      recorder.onerror = (event) => {
        // MediaRecorder error event
        const errorMessage = 'Recording error occurred. Please try again.';
        setError(errorMessage);
        setRecordingState('idle');
        stopTimer();
        console.error('MediaRecorder error:', event);
      };
      
      // Handle stream track ending unexpectedly
      stream.getTracks().forEach(track => {
        track.onended = () => {
          if (recorder.state === 'recording' || recorder.state === 'paused') {
            setError('Recording source was disconnected. Recording stopped.');
            try {
              recorder.stop();
            } catch (err) {
              console.error('Error stopping recorder after track ended:', err);
            }
          }
        };
      });
      
      mediaRecorderRef.current = recorder;
      
      // Start recording with error handling
      try {
        recorder.start(1000); // Fire ondataavailable every 1 second
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'InvalidStateError') {
            setError('Cannot start recording. The recorder is in an invalid state.');
          } else {
            setError(`Failed to start recording: ${err.message}`);
          }
        } else {
          setError('Failed to start recording.');
        }
        setRecordingState('idle');
        return;
      }
      
      setRecordingState('recording');
      startTimer();
      
    } catch (err) {
      let errorMessage = 'An unexpected error occurred while starting the recording.';
      
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setRecordingState('idle');
      stopTimer();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
        setRecordingState('paused');
        pauseTimer();
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? `Failed to pause recording: ${err.message}`
          : 'Failed to pause recording.';
        setError(errorMessage);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
        setRecordingState('recording');
        resumeTimer();
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? `Failed to resume recording: ${err.message}`
          : 'Failed to resume recording.';
        setError(errorMessage);
        // If resume fails, stop recording
        try {
          recorder.stop();
        } catch (stopErr) {
          console.error('Error stopping recorder after resume failure:', stopErr);
        }
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? `Failed to stop recording: ${err.message}`
          : 'Failed to stop recording.';
        setError(errorMessage);
        // Force state to stopped even if stop() failed
        setRecordingState('stopped');
        stopTimer();
      }
    }
  }, []);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  
  const discardRecording = useCallback(() => {
   
    setRecordedBlob(null);
   
    chunksRef.current = [];
    
    setDuration(0);
    
    setRecordingState('idle');
  }, []);

  return {
    recordingState,    
    recordedBlob,      
    duration,          
    error,             
    startRecording,    
    pauseRecording,   
    resumeRecording,   
    stopRecording,     
    discardRecording,
    clearError,
  };
}