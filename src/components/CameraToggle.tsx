'use client';

interface CameraToggleProps {

    isOn: boolean;

    isLoading: boolean;

    onToggle: () => void;

    className?: string;
}


export function CameraToggle({ isOn, isLoading, onToggle, className = '' }: CameraToggleProps) {
    return (
        <button
            onClick={onToggle}
            disabled={isLoading}
            className={`
        flex items-center gap-2 px-4 py-2 rounded-3xl font-medium transition-all
        ${isOn
                    ? 'bg-accent text-black hover:bg-accent-hover'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
            title={isOn ? 'Turn off camera' : 'Turn on camera'}
        >

            {isLoading ? (

                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            ) : isOn ? (

                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                </svg>
            ) : (

                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3l18 18"
                    />
                </svg>
            )}

            <span className="text-sm">
                {isLoading ? 'Loading...' : isOn ? 'Camera On' : 'Camera Off'}
            </span>
        </button>
    );
}