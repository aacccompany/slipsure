from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List
import secrets
from ..database import get_db
from ..models import User, ApiKey, WebhookConfig, VerificationLog
from ..schemas import (
    DashboardStats, DailyUsage, ApiKeyResponse, ApiKeyCreate, 
    WebhookResponse, WebhookCreate, VerificationLogResponse, UserResponse
)
from ..dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total Scans
    result = await db.execute(
        select(func.count(VerificationLog.id)).filter(VerificationLog.user_id == current_user.id)
    )
    total_scans = result.scalar() or 0
    
    # Success Rate
    result = await db.execute(
        select(func.count(VerificationLog.id))
        .filter(VerificationLog.user_id == current_user.id, VerificationLog.status == "success")
    )
    success_scans = result.scalar() or 0
    success_rate = (success_scans / total_scans * 100) if total_scans > 0 else 100.0
    
    return {
        "totalScans": total_scans,
        "successRate": round(success_rate, 1),
        "activeUsers": 0, # To be implemented with more complex logic
        "avgLatency": 0.8,
        "scansTrend": 0.0,
        "successTrend": 0.0,
        "usersTrend": 0.0,
        "latencyTrend": 0.0
    }

@router.get("/usage-daily", response_model=List[DailyUsage])
async def get_daily_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # This is a stub for now, would need date truncation and grouping in SQL
    return [
        {"day": "Mon", "successful": 0, "failed": 0},
        {"day": "Tue", "successful": 0, "failed": 0},
        {"day": "Wed", "successful": 0, "failed": 0},
        {"day": "Thu", "successful": 0, "failed": 0},
        {"day": "Fri", "successful": 0, "failed": 0},
        {"day": "Sat", "successful": 0, "failed": 0},
        {"day": "Sun", "successful": 0, "failed": 0},
    ]

@router.get("/keys", response_model=List[ApiKeyResponse])
async def get_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ApiKey).filter(ApiKey.user_id == current_user.id))
    return result.scalars().all()

@router.post("/keys", response_model=ApiKeyResponse)
async def create_key(
    key_in: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_key = ApiKey(
        name=key_in.name,
        key=f"sk_live_{secrets.token_hex(20)}",
        user_id=current_user.id
    )
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)
    return new_key

@router.delete("/keys/{key_id}")
async def delete_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ApiKey).filter(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    key = result.scalars().first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    
    await db.delete(key)
    await db.commit()
    return {"message": "Key deleted"}

@router.get("/logs")
async def get_logs(
    page: int = 1,
    search: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    limit = 10
    offset = (page - 1) * limit
    
    query = select(VerificationLog).filter(VerificationLog.user_id == current_user.id)
    if search:
        query = query.filter(VerificationLog.trans_ref.ilike(f"%{search}%"))
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0
    
    # Get data
    result = await db.execute(query.order_by(VerificationLog.timestamp.desc()).offset(offset).limit(limit))
    logs = result.scalars().all()
    
    return {"data": logs, "total": total}

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
