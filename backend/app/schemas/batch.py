from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class BatchBase(BaseModel):
    medicine_id: int
    batch_number: str = Field(..., min_length=2, max_length=50)
    supplier_id: Optional[int] = None
    purchase_order_item_id: Optional[int] = None
    quantity_received: int = Field(..., ge=1)
    quantity_available: int = Field(..., ge=0)
    unit_cost_price: float = Field(..., ge=0.0)
    mrp: float = Field(..., ge=0.0)
    manufacture_date: date
    expiry_date: date
    received_date: date = Field(default_factory=date.today)


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    batch_number: Optional[str] = Field(None, min_length=2, max_length=50)
    quantity_available: Optional[int] = Field(None, ge=0)
    unit_cost_price: Optional[float] = Field(None, ge=0.0)
    mrp: Optional[float] = Field(None, ge=0.0)
    expiry_date: Optional[date] = None


class BatchOut(BatchBase):
    id: int
    created_at: datetime
    medicine_name: Optional[str] = None
    supplier_name: Optional[str] = None
    is_expired: bool = False
    is_expiring_soon: bool = False  # <= 30 days
    days_to_expiry: int = 0

    class Config:
        from_attributes = True
