'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraPosition } from '@/types';

interface CameraOverlayProps {
    stream: MediaStream | null;
    position: CameraPosition;
    size: number;
    borderRadius: number;
    onClose?: () => void;
}

export function CameraOverlay({
    stream,
    position,
    size,
    borderRadius,
    onClose
}: CameraOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [videoBounds, setVideoBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && stream) {
            video.srcObject = stream;
            // Ensure video plays
            video.play().catch((err) => {
                console.warn('Camera video play error:', err);
            });
        }
        return () => {
            if (video) {
                video.srcObject = null;
            }
        };
    }, [stream]);

    // Calculate actual video display bounds (accounting for object-contain)
    useEffect(() => {
        if (!stream) {
            setVideoBounds(null);
            return;
        }

        const calculateBounds = () => {
            // Find the video container (ScreenPreview's root div)
            const previewWrapper = containerRef.current?.parentElement;
            const videoContainer = previewWrapper?.querySelector('div[class*="rounded-lg"]') as HTMLElement;
            const video = videoContainer?.querySelector('video') as HTMLVideoElement;

            if (!videoContainer || !video || !video.videoWidth || !video.videoHeight) {
                setVideoBounds(null);
                return;
            }

            const containerRect = videoContainer.getBoundingClientRect();
            const videoAspect = video.videoWidth / video.videoHeight;
            const containerAspect = containerRect.width / containerRect.height;

            let displayWidth: number;
            let displayHeight: number;
            let offsetX: number;
            let offsetY: number;

            if (videoAspect > containerAspect) {
                // Video is wider - fit to width
                displayWidth = containerRect.width;
                displayHeight = containerRect.width / videoAspect;
                offsetX = 0;
                offsetY = (containerRect.height - displayHeight) / 2;
            } else {
                // Video is taller - fit to height
                displayHeight = containerRect.height;
                displayWidth = containerRect.height * videoAspect;
                offsetX = (containerRect.width - displayWidth) / 2;
                offsetY = 0;
            }

            // Get position relative to the wrapper
            if (!previewWrapper) {
                setVideoBounds(null);
                return;
            }

            const wrapperRect = previewWrapper.getBoundingClientRect();
            const containerOffsetX = containerRect.left - wrapperRect.left;
            const containerOffsetY = containerRect.top - wrapperRect.top;

            setVideoBounds({
                x: containerOffsetX + offsetX,
                y: containerOffsetY + offsetY,
                width: displayWidth,
                height: displayHeight,
            });
        };

        // Wait a bit for layout to settle
        const timeoutId = setTimeout(calculateBounds, 200);

        const video = containerRef.current?.parentElement?.querySelector('video') as HTMLVideoElement;
        if (video) {
            const handleLoad = () => {
                setTimeout(calculateBounds, 100);
            };
            video.addEventListener('loadedmetadata', handleLoad);
            video.addEventListener('loadeddata', handleLoad);
            video.addEventListener('canplay', handleLoad);
            window.addEventListener('resize', calculateBounds);

            // Use ResizeObserver for better accuracy
            const resizeObserver = new ResizeObserver(() => {
                setTimeout(calculateBounds, 50);
            });
            const container = containerRef.current?.parentElement;
            if (container) {
                resizeObserver.observe(container);
            }

            return () => {
                clearTimeout(timeoutId);
                video.removeEventListener('loadedmetadata', handleLoad);
                video.removeEventListener('loadeddata', handleLoad);
                video.removeEventListener('canplay', handleLoad);
                window.removeEventListener('resize', calculateBounds);
                resizeObserver.disconnect();
            };
        }

        return () => {
            clearTimeout(timeoutId);
        };
    }, [stream, position, size]);

    if (!stream) return null;

    // Get the scale factor for all measurements
    // Compositor uses canvas height (same as screen capture height, typically 1080p)
    // Preview needs to scale everything proportionally to match
    const getScaleFactor = (): number => {
        if (!videoBounds || videoBounds.height === 0) {
            const container = containerRef.current?.parentElement;
            if (container) {
                const containerHeight = container.getBoundingClientRect().height;
                if (containerHeight > 0) {
                    return containerHeight / 1080;
                }
            }
            return 1;
        }
        return videoBounds.height / 1080;
    };

    const scaleFactor = getScaleFactor();

    // Scale the size - compositor uses: size = canvasHeight * (cameraSize / 1080)
    // Which equals: cameraSize when canvas is 1080p
    // So we need: scaledSize = cameraSize * (previewHeight / 1080)
    const scaledSize = Math.max(40, size * scaleFactor);

    // Scale the padding too - compositor uses 20px for 1080p canvas
    // So preview should use: 20 * scaleFactor
    const scaledPadding = Math.max(5, 20 * scaleFactor);

    // Calculate position relative to video bounds
    const getPositionStyles = (): React.CSSProperties => {
        if (!videoBounds) {
            // Fallback to container-relative positioning
            const baseStyles: Record<CameraPosition, React.CSSProperties> = {
                'top-left': { top: scaledPadding, left: scaledPadding },
                'top-right': { top: scaledPadding, right: scaledPadding },
                'bottom-left': { bottom: scaledPadding, left: scaledPadding },
                'bottom-right': { bottom: scaledPadding, right: scaledPadding },
            };
            return baseStyles[position];
        }

        // Position relative to actual video display area (matching compositor logic)
        const baseStyles: Record<CameraPosition, React.CSSProperties> = {
            'top-left': {
                top: videoBounds.y + scaledPadding,
                left: videoBounds.x + scaledPadding,
            },
            'top-right': {
                top: videoBounds.y + scaledPadding,
                left: videoBounds.x + videoBounds.width - scaledSize - scaledPadding,
            },
            'bottom-left': {
                top: videoBounds.y + videoBounds.height - scaledSize - scaledPadding,
                left: videoBounds.x + scaledPadding,
            },
            'bottom-right': {
                top: videoBounds.y + videoBounds.height - scaledSize - scaledPadding,
                left: videoBounds.x + videoBounds.width - scaledSize - scaledPadding,
            },
        };
        return baseStyles[position];
    };

    // Border radius calculation - gradual from 0 (square) to 100 (circle)
    // At 100%, borderRadius = scaledSize / 2 = perfect circle
    // The formula: (borderRadius / 100) * (scaledSize / 2) gives us:
    //   - 0% = 0px (square)
    //   - 50% = scaledSize / 4 (rounded)
    //   - 100% = scaledSize / 2 (perfect circle)
    const borderRadiusPixels = (borderRadius / 100) * (scaledSize / 2);

    return (
        <div
            ref={containerRef}
            className="absolute z-10 shadow-2xl overflow-hidden"
            style={{
                width: scaledSize,
                height: scaledSize,
                borderRadius: borderRadiusPixels,
                ...getPositionStyles(),
            }}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                    transform: 'scaleX(-1)',
                }}
            />


            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                    title="Turn off camera"
                >
                    <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}

            <div
                className="absolute inset-0 border-2 border-white/20 pointer-events-none"
                style={{ borderRadius: borderRadiusPixels }}
            />
        </div>
    );
}