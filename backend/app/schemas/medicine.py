from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    generic_name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=100)
    manufacturer: str = Field(..., min_length=1, max_length=150)
    unit: str = Field(..., min_length=1, max_length=50)
    pack_size: int = Field(default=1, ge=1)
    reorder_level: int = Field(default=10, ge=0)
    hsn_code: Optional[str] = None
    is_active: bool = True


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    unit: Optional[str] = None
    pack_size: Optional[int] = None
    reorder_level: Optional[int] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None


class MedicineOut(MedicineBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicineWithStock(MedicineOut):
    total_stock: int = 0
    available_batches_count: int = 0
    is_low_stock: bool = False
    has_expiring_soon: bool = False
    has_expired: bool = False
    earliest_expiry: Optional[datetime] = None
