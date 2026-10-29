from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    contact_person: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^\d{10}$", description="10-digit mobile number")
    email: EmailStr
    address: str = Field(..., min_length=3, max_length=255)
    gst_number: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_person: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$", description="10-digit mobile number")
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, min_length=3, max_length=255)
    gst_number: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    total_orders_count: int = 0
    total_spend: float = 0.0

    class Config:
        from_attributes = True
