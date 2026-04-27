import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from pyzbar.pyzbar import decode
import requests
import os
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

app = FastAPI(title="Slipsure API Gateway")

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
BANK_GATEWAY_URL = "https://api.slipok.com/api/line/apikey/"
API_KEY = os.getenv("BANK_API_KEY", "YOUR_KEY_HERE")

# Line Configuration
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "YOUR_CHANNEL_SECRET")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "YOUR_ACCESS_TOKEN")

configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# --- UTILS ---

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

def call_bank_api_gateway(qr_payload):
    """ส่งข้อมูลไปตรวจสอบกับธนาคาร"""
    if USE_MOCK:
        # จำลองข้อมูลเพื่อทดสอบ
        return {
            "success": True,
            "message": "ตรวจสอบสำเร็จ (MOCK)",
            "data": {
                "amount": 1250.00,
                "transRef": qr_payload.split("=")[-1] if "=" in qr_payload else "REF123456",
                "transDate": "2024-04-27",
                "transTime": "14:20:05",
                "sendingBank": "KASIKORNBANK",
                "receivingBank": "SCB",
                "sender": {"displayName": "สมชาย ใจดี"},
                "receiver": {"displayName": "บจก. สลิปชัวร์"}
            }
        }
    
    payload = {"data": qr_payload}
    headers = {"x-lib-apikey": API_KEY}
    response = requests.post(f"{BANK_GATEWAY_URL}/{API_KEY}", json=payload)
    return response.json()

# --- ENDPOINTS ---

@app.post("/verify-slip")
async def verify_slip(file: UploadFile = File(...)):
    """API สำหรับ Frontend หรือการเชื่อมต่อทั่วไป (REST API)"""
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
        
        # 1. ดาวน์โหลดรูปภาพจาก Line
        message_content = line_bot_blob_api.get_message_content(event.message.id)
        
        # 2. สแกนและตรวจสอบ
        qr_data = extract_qr_data(message_content)
        
        if not qr_data:
            reply_text = "❌ ไม่พบ QR Code ในรูปภาพสลิปของคุณ กรุณาส่งรูปที่ชัดเจนอีกครั้ง"
        else:
            result = call_bank_api_gateway(qr_data)
            if result.get("success"):
                d = result["data"]
                reply_text = (
                    f"✅ ยืนยันสลิปสำเร็จ\n"
                    f"💰 ยอดเงิน: {d['amount']} บาท\n"
                    f"👤 จาก: {d['sender']['displayName']} ({d['sendingBank']})\n"
                    f"🏢 ถึง: {d['receiver']['displayName']}\n"
                    f"⏰ เมื่อ: {d['transDate']} {d['transTime']}"
                )
            else:
                reply_text = f"⚠️ ตรวจสอบสลิปไม่สำเร็จ: {result.get('message', 'ข้อมูลไม่ถูกต้อง')}"

        # 3. ตอบกลับลูกค้า
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)]
            )
        )

@app.get("/health")
def health():
    return {"status": "online", "features": ["REST_API", "LINE_WEBHOOK", "QR_SCANNER"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
