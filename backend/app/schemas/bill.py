from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.bill import PaymentMode, PaymentStatus


class BillItemInput(BaseModel):
    medicine_id: int
    quantity: int = Field(..., ge=1)
    batch_id: Optional[int] = None  # Optional; if None, FEFO selects earliest expiry batch
    unit_price: Optional[float] = None  # Optional; if None, batch MRP is used


class BillCreate(BaseModel):
    patient_id: int
    discount: float = Field(default=0.0, ge=0.0)
    tax: float = Field(default=0.0, ge=0.0)
    payment_mode: PaymentMode = PaymentMode.CASH
    payment_status: PaymentStatus = PaymentStatus.PAID
    items: List[BillItemInput] = Field(..., min_length=1)


class BillItemOut(BaseModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    batch_id: int
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True


class BillOut(BaseModel):
    id: int
    bill_number: str
    patient_id: int
    patient_name: Optional[str] = None
    patient_uhid: Optional[str] = None
    patient_phone: Optional[str] = None
    bill_date: datetime
    subtotal: float
    discount: float
    tax: float
    net_amount: float
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    created_by: int
    created_by_name: Optional[str] = None
    created_at: datetime
    items: List[BillItemOut] = []

    class Config:
        from_attributes = True
