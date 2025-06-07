// QR Code generation utility
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    // Using QRCode.js library via CDN
    // In a real implementation, you would install qrcode package
    const QRCode = (window as any).QRCode;
    
    if (!QRCode) {
      throw new Error("QRCode library not loaded");
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      QRCode.toCanvas(canvas, data, {
        width: 200,
        margin: 2,
        color: {
          dark: "#1976D2",
          light: "#FFFFFF"
        }
      }, (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve(canvas.toDataURL());
        }
      });
    });
  } catch (error) {
    console.error("QR generation error:", error);
    throw new Error("Failed to generate QR code");
  }
};

// QR Code validation utility
export const validateQRData = (data: string): boolean => {
  try {
    const parsed = JSON.parse(data);
    return parsed.type === "attendance" && parsed.sessionId && parsed.timestamp;
  } catch {
    return false;
  }
};

// Extract session ID from QR data
export const extractSessionId = (data: string): string | null => {
  try {
    const parsed = JSON.parse(data);
    return parsed.sessionId || null;
  } catch {
    return null;
  }
};
