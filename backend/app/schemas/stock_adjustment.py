from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.stock_adjustment import AdjustmentType


class StockAdjustmentCreate(BaseModel):
    medicine_id: int
    batch_id: int
    adjustment_type: AdjustmentType
    quantity: int = Field(..., description="Quantity delta (positive or negative)")
    reason: str = Field(..., min_length=3)


class StockAdjustmentOut(BaseModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    batch_id: int
    batch_number: Optional[str] = None
    adjustment_type: AdjustmentType
    quantity: int
    reason: str
    adjusted_by: int
    adjusted_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
