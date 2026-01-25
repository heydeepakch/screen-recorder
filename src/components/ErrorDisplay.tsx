'use client';

interface ErrorDisplayProps {
  /** Error message */
  error: string;
  /** Optional retry function */
  onRetry?: () => void;
  /** Optional dismiss function */
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <svg
          className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        
        {/* Error content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive mb-1">Error</p>
          <p className="text-sm text-destructive/90">{error}</p>
          
          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs px-3 py-1.5 bg-destructive hover:bg-destructive-hover text-white rounded transition-colors"
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}