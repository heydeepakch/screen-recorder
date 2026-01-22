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
      
     
      chunksRef.current = [];
      setRecordedBlob(null);
      
     
      const mimeType = getSupportedMimeType();
     
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: videoBitrate * 1_000_000,
      });
      
     
      recorder.ondataavailable = (event) => {
        // Only save if there's actual data
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      
      recorder.onstop = () => {
        // Combine all chunks into a single Blob
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setRecordingState('stopped');
        stopTimer();
      };
      
     
      recorder.onerror = (event) => {
        setError('Recording error occurred');
        setRecordingState('idle');
        stopTimer();
      };
      
     
      mediaRecorderRef.current = recorder;
     
      recorder.start(1000);
      
      setRecordingState('recording');
      startTimer();
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setRecordingState('idle');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      setRecordingState('paused');
      pauseTimer();
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      setRecordingState('recording');
      resumeTimer();
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    
    if (recorder && recorder.state !== 'inactive') {
     
      recorder.stop();
    
    }
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
  };
}