import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from pyzbar.pyzbar import decode
import requests
import os
import time
import base64
from dotenv import load_dotenv

# Line Bot SDK
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    ReplyMessageRequest,
    TextMessage,
    MessagingApiBlob
)
from linebot.v3.webhooks import MessageEvent, ImageMessageContent

load_dotenv()

app = FastAPI(title="Slipsure API Gateway (KBank Direct)")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
USE_MOCK = os.getenv("USE_MOCK", "True").lower() == "true"

BANK_CODES = {
    "002": "BBL",
    "004": "KBANK",
    "006": "KTB",
    "011": "TTB",
    "014": "SCB",
    "030": "GSB",
    "033": "GHB",
    "065": "Thanachart",
    "066": "Islamic",
    "067": "TISCO",
    "069": "KKP",
    "070": "ICBC",
    "071": "Thai Credit",
    "073": "Land and Houses",
    "098": "SME",
}

# KBank Configuration
KBANK_CLIENT_ID = os.getenv("KBANK_CLIENT_ID", "")
KBANK_CLIENT_SECRET = os.getenv("KBANK_CLIENT_SECRET", "")
KBANK_API_URL = os.getenv("KBANK_API_URL", "https://openapi-sandbox.kasikornbank.com")

# Line Configuration
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# Token Cache
_kbank_token = None
_token_expiry = 0

# --- UTILS ---

def parse_emvco(data):
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

def extract_qr_data(image_bytes):
    """สแกนหาข้อมูลจาก QR Code ในรูปภาพ"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return None

    decoded_objects = decode(img)
    if not decoded_objects:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        decoded_objects = decode(gray)

    if decoded_objects:
        return decoded_objects[0].data.decode('utf-8')
    return None

def get_kbank_token():
    """ขอ Access Token จาก KBank OAuth2"""
    global _kbank_token, _token_expiry
    
    # Check if token is still valid (expire in 29 mins, we refresh at 25)
    if _kbank_token and time.time() < _token_expiry:
        return _kbank_token

    auth_str = f"{KBANK_CLIENT_ID}:{KBANK_CLIENT_SECRET}"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {encoded_auth}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}
    
    response = requests.post(f"{KBANK_API_URL}/v2/oauth/token", headers=headers, data=data)
    
    if response.status_code == 200:
        res_json = response.json()
        _kbank_token = res_json.get("access_token")
        # Set expiry slightly earlier than actual to be safe
        _token_expiry = time.time() + int(res_json.get("expires_in", 1740)) - 60
        return _kbank_token
    else:
        print(f"KBank Auth Error: {response.text}")
        return None

def call_bank_api_gateway(qr_payload):
    """ส่งข้อมูลไปตรวจสอบกับ KBank โดยตรง"""
    if USE_MOCK:
        # จำลองข้อมูลเพื่อทดสอบ
        s_bank = "004"
        r_bank = "014"
        return {
            "success": True,
            "message": "ตรวจสอบสำเร็จ (MOCK)",
            "data": {
                "amount": 1250.00,
                "transRef": "KB" + str(int(time.time())),
                "transDate": "2024-04-28",
                "transTime": "10:30:00",
                "sendingBank": BANK_CODES.get(s_bank, s_bank),
                "receivingBank": BANK_CODES.get(r_bank, r_bank),
                "sender": {"displayName": "สมชาย ใจดี"},
                "receiver": {"displayName": "บจก. สลิปชัวร์"}
            }
        }
    
    # 1. Parse QR Data
    qr_tags = parse_emvco(qr_payload)
    tag30_data = qr_tags.get("30", "")
    tag30_subtags = parse_emvco(tag30_data)
    
    sending_bank = tag30_subtags.get("01")
    trans_ref = tag30_subtags.get("02")
    
    if not sending_bank or not trans_ref:
        return {"success": False, "message": "ไม่สามารถอ่านข้อมูลธนาคารหรือเลขอ้างอิงจาก QR Code ได้"}

    # 2. Get Token
    token = get_kbank_token()
    if not token:
        return {"success": False, "message": "ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตนของธนาคารได้"}

    # 3. Call KBank Verify API
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "sendingBank": sending_bank,
        "transRef": trans_ref
    }
    
    try:
        response = requests.post(
            f"{KBANK_API_URL}/v2/quotes/slip/verify", 
            headers=headers, 
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            
            s_bank = data.get("sendingBank", "")
            r_bank = data.get("receivingBank", "")
            
            # Map KBank Response to Slipsure Format
            return {
                "success": True,
                "data": {
                    "amount": float(data.get("amount", 0)),
                    "transRef": data.get("transRef"),
                    "transDate": data.get("transDate"),
                    "transTime": data.get("transTime"),
                    "sendingBank": BANK_CODES.get(s_bank, s_bank),
                    "receivingBank": BANK_CODES.get(r_bank, r_bank),
                    "sender": {"displayName": data.get("sender", {}).get("displayName")},
                    "receiver": {"displayName": data.get("receiver", {}).get("displayName")}
                }
            }
        else:
            return {"success": False, "message": f"ธนาคารตอบกลับผิดพลาด: {response.status_code}"}
            
    except Exception as e:
        return {"success": False, "message": f"เกิดข้อผิดพลาดในการเชื่อมต่อ: {str(e)}"}

# --- ENDPOINTS ---

@app.post("/verify-slip")
async def verify_slip(file: UploadFile = File(...)):
    """API สำหรับ Frontend"""
    contents = await file.read()
    qr_data = extract_qr_data(contents)
    
    if not qr_data:
        raise HTTPException(status_code=400, detail="ไม่พบ QR Code ในรูปภาพ")

    result = call_bank_api_gateway(qr_data)
    return result

@app.post("/webhook")
async def line_webhook(request: Request, x_line_signature: str = Header(None)):
    """Line OA Webhook Endpoint"""
    body = await request.body()
    try:
        handler.handle(body.decode("utf-8"), x_line_signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    return "OK"

@handler.add(MessageEvent, message=ImageMessageContent)
def handle_image_message(event):
    """เมื่อได้รับรูปภาพทาง Line OA"""
    with ApiClient(configuration) as api_client:
        line_bot_blob_api = MessagingApiBlob(api_client)
        line_bot_api = MessagingApi(api_client)
        
        message_content = line_bot_blob_api.get_message_content(event.message.id)
        qr_data = extract_qr_data(message_content)
        
        if not qr_data:
            reply_text = "❌ ไม่พบ QR Code ในรูปภาพสลิปของคุณ"
        else:
            result = call_bank_api_gateway(qr_data)
            if result.get("success"):
                d = result["data"]
                reply_text = (
                    f"✅ ยืนยันสลิปสำเร็จ (KBank API)\n"
                    f"💰 ยอดเงิน: {d['amount']} บาท\n"
                    f"👤 จาก: {d['sender']['displayName']}\n"
                    f"🏢 ถึง: {d['receiver']['displayName']}\n"
                    f"⏰ เมื่อ: {d['transDate']} {d['transTime']}"
                )
            else:
                reply_text = f"⚠️ ตรวจสอบสลิปไม่สำเร็จ: {result.get('message', 'ข้อมูลไม่ถูกต้อง')}"

        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)]
            )
        )

@app.get("/health")
def health():
    return {"status": "online", "integration": "KBank Direct"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
