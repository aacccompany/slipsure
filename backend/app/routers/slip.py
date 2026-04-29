from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from ..database import get_db
from ..models import User, ApiKey, VerificationLog
from ..services.qr_service import QRService
from ..services.bank_service import bank_service
from ..dependencies import get_current_user
import secrets

router = APIRouter(tags=["Slip Verification"])

async def get_user_from_api_key(api_key: str, db: AsyncSession):
    result = await db.execute(select(ApiKey).filter(ApiKey.key == api_key, ApiKey.status == "active"))
    db_key = result.scalars().first()
    if not db_key:
        return None
    
    result = await db.execute(select(User).filter(User.id == db_key.user_id))
    return result.scalars().first(), db_key.id

@router.post("/verify-slip")
async def verify_slip(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    # 1. Auth check
    current_user = None
    api_key_id = None
    
    if x_api_key:
        res = await get_user_from_api_key(x_api_key, db)
        if res:
            current_user, api_key_id = res
        else:
            raise HTTPException(status_code=401, detail="Invalid API Key")
    
    # 2. Extract QR
    contents = await file.read()
    qr_data = QRService.extract_qr_data(contents)
    
    if not qr_data:
        # Log failure
        if current_user:
            log = VerificationLog(
                user_id=current_user.id,
                api_key_id=api_key_id,
                status="failed",
                error_message="QR Code not found"
            )
            db.add(log)
            await db.commit()
        raise HTTPException(status_code=400, detail="ไม่พบ QR Code ในรูปภาพ")

    # 3. Verify with Bank
    result = await bank_service.verify_slip(qr_data)
    
    # 4. Log to DB
    if current_user:
        log = VerificationLog(
            user_id=current_user.id,
            api_key_id=api_key_id,
            amount=result["data"]["amount"] if result["success"] else 0,
            sender_name=result["data"]["sender"]["displayName"] if result["success"] else "Unknown",
            sender_bank=result["data"]["sendingBank"] if result["success"] else "Unknown",
            receiver_name=result["data"]["receiver"]["displayName"] if result["success"] else "Unknown",
            receiver_bank=result["data"]["receivingBank"] if result["success"] else "Unknown",
            trans_ref=result["data"]["transRef"] if result["success"] else "Unknown",
            status="success" if result["success"] else "failed",
            error_message=result.get("message")
        )
        db.add(log)
        await db.commit()

    return result
