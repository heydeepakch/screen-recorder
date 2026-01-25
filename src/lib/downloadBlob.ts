
export function downloadBlob(blob: Blob, filename: string): void {
   
    const url = URL.createObjectURL(blob);
   
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    
    link.click();
    
    /**
     * IMPORTANT: Clean up the Object URL
     * 
     * Object URLs consume memory until revoked.
     * If you create many without revoking, you'll have a memory leak!
     * 
     * We use setTimeout to give the browser time to start the download
     * before we revoke the URL.
     */
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * Generate a filename with timestamp
   * 
   * Example output: "screen-recording-2024-01-15-143052.webm"
   * 
   * @param extension - File extension (default: 'webm')
   * @returns Formatted filename string
   */
  export function generateFilename(extension: string = 'webm'): string {
    const now = new Date();
    
    // Format: YYYY-MM-DD-HHMMSS
    const timestamp = now.toISOString()
      .replace(/T/, '-')      // Replace T with dash
      .replace(/\..+/, '')    // Remove milliseconds
      .replace(/:/g, '');     // Remove colons (invalid in filenames on Windows)
    
    return `screen-recording-${timestamp}.${extension}`;
  }