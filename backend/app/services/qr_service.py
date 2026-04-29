import cv2
import numpy as np
from pyzbar.pyzbar import decode

class QRService:
    @staticmethod
    def extract_qr_data(image_bytes: bytes) -> str:
        """สแกนหาข้อมูลจาก QR Code ในรูปภาพ"""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return None

        decoded_objects = decode(img)
        if not decoded_objects:
            # ลองใช้ Grayscale เพื่อเพิ่มความชัดเจน
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            decoded_objects = decode(gray)

        if decoded_objects:
            return decoded_objects[0].data.decode('utf-8')
        return None

    @staticmethod
    def parse_emvco(data: str) -> dict:
        """Parse EMVCo TLV format"""
        res = {}
        i = 0
        try:
            while i < len(data):
                tag = data[i:i+2]
                length = int(data[i+2:i+4])
                value = data[i+4:i+4+length]
                res[tag] = value
                i += 4 + length
        except:
            pass
        return res
