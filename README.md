# Screen Recorder

A browser-based screen recorder built with Next.js. Record your screen with optional webcam overlay and microphone audio.

## Features

- Screen recording with customizable quality (FPS and bitrate)
- Webcam overlay with adjustable position, size, and roundness
- Microphone audio recording
- System audio capture (when sharing browser tabs)
- Pause and resume recording
- Preview before download
- WebM output format

## Requirements

- Node.js 18 or higher
- Modern browser with screen capture support (Chrome, Edge, Firefox)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser.

## Usage

1. Click "Share Screen" and select what to record.
2. Enable camera and/or microphone if needed.
3. Adjust settings (FPS, quality, camera position).
4. Click "Start Recording".
5. Click "Stop Recording" when done.
6. Preview and download the recording.

## Keyboard Shortcuts

- `Ctrl+Shift+R` - Start/Stop recording
- `Space` - Pause/Resume recording
- `Esc` - Stop sharing

## Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
