from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.purchase_order import POStatus


class POItemBase(BaseModel):
    medicine_id: int
    quantity_ordered: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0.0)


class POItemCreate(POItemBase):
    pass


class POItemOut(POItemBase):
    id: int
    quantity_received: int
    medicine_name: Optional[str] = None
    line_total: float = 0.0

    class Config:
        from_attributes = True


class POCreate(BaseModel):
    supplier_id: int
    order_date: date = Field(default_factory=date.today)
    expected_date: Optional[date] = None
    items: List[POItemCreate] = Field(..., min_length=1)


class POUpdate(BaseModel):
    supplier_id: Optional[int] = None
    expected_date: Optional[date] = None
    items: Optional[List[POItemCreate]] = None
    status: Optional[POStatus] = None


class POOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    order_date: date
    expected_date: Optional[date] = None
    status: POStatus
    total_amount: float
    created_by: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[POItemOut] = []

    class Config:
        from_attributes = True


class ReceiveItemInput(BaseModel):
    item_id: int  # purchase_order_item_id
    quantity_receiving: int = Field(..., ge=1)
    batch_number: str = Field(..., min_length=1)
    manufacture_date: date
    expiry_date: date
    mrp: float = Field(..., ge=0.0)
    unit_cost_price: Optional[float] = None  # if not provided, defaults to PO item unit_price


class ReceiveGoodsRequest(BaseModel):
    items: List[ReceiveItemInput] = Field(..., min_length=1)
