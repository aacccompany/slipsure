from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    company_name = Column(String)
    tax_id = Column(String, nullable=True)
    plan = Column(String, default="Developer Plan")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    api_keys = relationship("ApiKey", back_populates="owner", cascade="all, delete-orphan")
    webhooks = relationship("WebhookConfig", back_populates="owner", cascade="all, delete-orphan")
    verification_logs = relationship("VerificationLog", back_populates="owner", cascade="all, delete-orphan")

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    key = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active") # active, revoked
    
    owner = relationship("User", back_populates="api_keys")

class WebhookConfig(Base):
    __tablename__ = "webhooks"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    url = Column(String, nullable=False)
    events = Column(JSON, default=[]) # List of events like "slip.verified"
    user_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="healthy") # healthy, unhealthy
    
    owner = relationship("User", back_populates="webhooks")

class VerificationLog(Base):
    __tablename__ = "verification_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True) # Optional if scanned via API Key
    api_key_id = Column(String, ForeignKey("api_keys.id"), nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    amount = Column(Float)
    sender_name = Column(String)
    sender_bank = Column(String)
    receiver_name = Column(String)
    receiver_bank = Column(String)
    trans_ref = Column(String, index=True)
    status = Column(String) # success, failed
    error_message = Column(String, nullable=True)
    
    owner = relationship("User", back_populates="verification_logs")
