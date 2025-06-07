import { useRef, useEffect, useState } from "react";
import { Camera, Square, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/use-camera";

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
}

export default function QRScanner({ onScan, isScanning, onStartScan, onStopScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startCamera, stopCamera, stream, error } = useCamera();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isScanning && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      startScanning();
    } else if (!isScanning) {
      stopScanning();
    }
  }, [isScanning, stream]);

  const startScanning = () => {
    setScanning(true);
    // In a real implementation, you would use a QR code library here
    // For now, we'll simulate QR detection
    simulateQRDetection();
  };

  const stopScanning = () => {
    setScanning(false);
  };

  // Simulate QR code detection for demo purposes
  const simulateQRDetection = () => {
    // This would normally use a library like @zxing/library or qr-scanner
    setTimeout(() => {
      if (scanning && isScanning) {
        const mockQRData = JSON.stringify({
          sessionId: "CS101-" + Date.now(),
          timestamp: new Date().toISOString(),
          type: "attendance",
        });
        onScan(mockQRData);
        setScanning(false);
      }
    }, 3000);
  };

  const handleStartScan = async () => {
    try {
      await startCamera();
      onStartScan();
    } catch (err) {
      console.error("Failed to start camera:", err);
    }
  };

  const handleStopScan = () => {
    stopCamera();
    onStopScan();
  };

  return (
    <div className="space-y-4">
      {/* Camera Display */}
      <div className="qr-scanner-container aspect-square relative">
        {isScanning && stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="qr-scanner-overlay">
              <div className="qr-scanner-frame">
                <div className="qr-scanner-corners top-left"></div>
                <div className="qr-scanner-corners top-right"></div>
                <div className="qr-scanner-corners bottom-left"></div>
                <div className="qr-scanner-corners bottom-right"></div>
                {scanning && (
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent animate-scan"></div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Camera Preview</p>
              <p className="text-gray-300 text-sm">Click "Start Scanner" to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3">
        {!isScanning ? (
          <Button onClick={handleStartScan} className="flex-1 bg-primary hover:bg-primary/90">
            <Camera className="w-4 h-4 mr-2" />
            Start QR Scanner
          </Button>
        ) : (
          <Button onClick={handleStopScan} variant="destructive" className="flex-1">
            <StopCircle className="w-4 h-4 mr-2" />
            Stop Scanner
          </Button>
        )}
        <Button variant="outline" className="px-4">
          <Square className="w-4 h-4" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
