'use client';

import { useEffect } from 'react';

interface KeyboardShortcuts {
  /** Start/Stop recording (Space or Ctrl+Shift+R) */
  onToggleRecording?: () => void;
  /** Pause/Resume recording (Space when recording) */
  onTogglePause?: () => void;
  /** Stop sharing (Escape) */
  onStopSharing?: () => void;
}

export function useKeyboardShortcuts({
  onToggleRecording,
  onTogglePause,
  onStopSharing,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Escape: Stop sharing
      if (e.key === 'Escape' && onStopSharing) {
        e.preventDefault();
        onStopSharing();
        return;
      }

      // Ctrl+Shift+R or Cmd+Shift+R: Start/Stop recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        onToggleRecording?.();
        return;
      }

      // Space: Toggle pause (only when recording)
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onTogglePause?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleRecording, onTogglePause, onStopSharing]);
}