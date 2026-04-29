import httpx
import time
import base64
from typing import Optional, Dict, Any
from ..config import settings
from .qr_service import QRService
from ..logger import logger

class BankService:
    def __init__(self):
        self._kbank_token = None
        self._token_expiry = 0
        self.BANK_CODES = {
            "002": "BBL", "004": "KBANK", "006": "KTB", "011": "TTB",
            "014": "SCB", "030": "GSB", "033": "GHB", "065": "Thanachart",
            "066": "Islamic", "067": "TISCO", "069": "KKP", "070": "ICBC",
            "071": "Thai Credit", "073": "Land and Houses", "098": "SME",
        }

    async def _get_kbank_token(self) -> Optional[str]:
        if self._kbank_token and time.time() < self._token_expiry:
            return self._kbank_token

        auth_str = f"{settings.KBANK_CLIENT_ID}:{settings.KBANK_CLIENT_SECRET}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.KBANK_API_URL}/v2/oauth/token", 
                    headers=headers, 
                    data=data,
                    timeout=10.0
                )
                if response.status_code == 200:
                    res_json = response.json()
                    self._kbank_token = res_json.get("access_token")
                    self._token_expiry = time.time() + int(res_json.get("expires_in", 1740)) - 60
                    logger.info("KBank Access Token refreshed successfully")
                    return self._kbank_token
                else:
                    logger.error(f"KBank Auth Error: {response.status_code} - {response.text}")
            except Exception as e:
                logger.error(f"KBank Auth Exception: {str(e)}")
        return None

    async def verify_slip(self, qr_payload: str) -> Dict[str, Any]:
        if settings.USE_MOCK:
            logger.info("Using MOCK verification for QR payload")
            return {
                "success": True,
                "data": {
                    "amount": 1250.00,
                    "transRef": "KB" + str(int(time.time())),
                    "transDate": "2024-04-28",
                    "transTime": "10:30:00",
                    "sendingBank": "KBANK",
                    "receivingBank": "SCB",
                    "sender": {"displayName": "สมชาย ใจดี"},
                    "receiver": {"displayName": "บจก. สลิปชัวร์"}
                }
            }

        # 1. Parse QR Data
        qr_tags = QRService.parse_emvco(qr_payload)
        tag30_data = qr_tags.get("30", "")
        tag30_subtags = QRService.parse_emvco(tag30_data)
        
        sending_bank = tag30_subtags.get("01")
        trans_ref = tag30_subtags.get("02")
        
        if not sending_bank or not trans_ref:
            logger.warning(f"Invalid QR Payload format: {qr_payload[:50]}...")
            return {"success": False, "message": "ไม่สามารถอ่านข้อมูลธนาคารหรือเลขอ้างอิงจาก QR Code ได้"}

        # 2. Get Token
        token = await self._get_kbank_token()
        if not token:
            return {"success": False, "message": "ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตนของธนาคารได้"}

        # 3. Call KBank Verify API
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {"sendingBank": sending_bank, "transRef": trans_ref}
        
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Calling KBank Verify API for ref: {trans_ref}")
                response = await client.post(
                    f"{settings.KBANK_API_URL}/v2/quotes/slip/verify", 
                    headers=headers, 
                    json=payload,
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    s_bank = data.get("sendingBank", "")
                    r_bank = data.get("receivingBank", "")
                    
                    logger.info(f"Slip Verified Successfully: {trans_ref} - {data.get('amount')} THB")
                    
                    return {
                        "success": True,
                        "data": {
                            "amount": float(data.get("amount", 0)),
                            "transRef": data.get("transRef"),
                            "transDate": data.get("transDate"),
                            "transTime": data.get("transTime"),
                            "sendingBank": self.BANK_CODES.get(s_bank, s_bank),
                            "receivingBank": self.BANK_CODES.get(r_bank, r_bank),
                            "sender": {"displayName": data.get("sender", {}).get("displayName")},
                            "receiver": {"displayName": data.get("receiver", {}).get("displayName")}
                        }
                    }
                
                logger.error(f"Bank API Error: {response.status_code} - {response.text}")
                return {"success": False, "message": f"ธนาคารตอบกลับผิดพลาด: {response.status_code}"}
            except Exception as e:
                logger.error(f"Bank API Exception: {str(e)}")
                return {"success": False, "message": f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(e)}"}

bank_service = BankService()
