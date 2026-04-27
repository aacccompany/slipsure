import jsQR from 'jsqr';
import { QRScanResult } from '@/types/slip';

export const scanQRCode = async (file: File): Promise<QRScanResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          resolve({ success: false, error: 'Could not initialize canvas context' });
          return;
        }

        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          resolve({ success: true, data: code.data });
        } else {
          resolve({ success: false, error: 'No QR code found in the image' });
        }
      };
      
      image.onerror = () => {
        resolve({ success: false, error: 'Failed to load image' });
      };
      
      image.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    
    reader.readAsDataURL(file);
  });
};
