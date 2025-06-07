import { useState, useRef, useCallback } from "react";

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request camera permissions
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Try to use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      let errorMessage = "Failed to access camera";
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Camera access denied. Please allow camera permissions.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera found on this device.";
        } else if (err.name === "NotSupportedError") {
          errorMessage = "Camera is not supported on this device.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error("Camera error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
    setError(null);
  }, []);

  const switchCamera = useCallback(async () => {
    if (streamRef.current) {
      stopCamera();
      // Add a small delay before starting new camera
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }, [startCamera, stopCamera]);

  return {
    stream,
    error,
    isLoading,
    startCamera,
    stopCamera,
    switchCamera,
  };
};
