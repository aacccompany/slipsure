from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    tax_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str # This will be the email
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    id: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- DASHBOARD SCHEMAS ---

class DashboardStats(BaseModel):
    totalScans: int
    successRate: float
    activeUsers: int
    avgLatency: float
    scansTrend: float
    successTrend: float
    usersTrend: float
    latencyTrend: float

class DailyUsage(BaseModel):
    day: str
    successful: int
    failed: int

class ApiKeyBase(BaseModel):
    name: str

class ApiKeyCreate(ApiKeyBase):
    pass

class ApiKeyResponse(ApiKeyBase):
    id: str
    key: str
    created_at: datetime
    last_used_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True

class WebhookBase(BaseModel):
    url: HttpUrl
    events: List[str]

class WebhookCreate(WebhookBase):
    pass

class WebhookResponse(WebhookBase):
    id: str
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

class VerificationLogResponse(BaseModel):
    id: str
    timestamp: datetime
    amount: float
    sender_name: str
    sender_bank: str
    receiver_name: str
    receiver_bank: str
    trans_ref: str
    status: str
    error_message: Optional[str]

    class Config:
        from_attributes = True
