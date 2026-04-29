from fastapi import APIRouter, Request, Header, HTTPException, Depends
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
from ..config import settings
from ..services.qr_service import QRService
from ..services.bank_service import bank_service

router = APIRouter(tags=["Webhooks"])

configuration = Configuration(access_token=settings.LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(settings.LINE_CHANNEL_SECRET)

@router.post("/webhook")
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
    import asyncio
    
    async def process():
        with ApiClient(configuration) as api_client:
            line_bot_blob_api = MessagingApiBlob(api_client)
            line_bot_api = MessagingApi(api_client)
            
            message_content = line_bot_blob_api.get_message_content(event.message.id)
            qr_data = QRService.extract_qr_data(message_content)
            
            if not qr_data:
                reply_text = "❌ ไม่พบ QR Code ในรูปภาพสลิปของคุณ"
            else:
                result = await bank_service.verify_slip(qr_data)
                if result.get("success"):
                    d = result["data"]
                    reply_text = (
                        f"✅ ยืนยันสลิปสำเร็จ (Bank API)\n"
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
            
    # Simple sync-to-async bridge for Line SDK
    asyncio.run(process())
