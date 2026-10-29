from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class MedicineBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    generic_name: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., min_length=2, max_length=100)
    manufacturer: str = Field(..., min_length=2, max_length=150)
    unit: str = Field(..., min_length=1, max_length=50)
    pack_size: int = Field(default=1, ge=1, le=10000)
    reorder_level: int = Field(default=10, ge=0, le=100000)
    hsn_code: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class MedicineCreate(MedicineBase):
    pass


class MedicineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    generic_name: Optional[str] = Field(None, min_length=2, max_length=150)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    manufacturer: Optional[str] = Field(None, min_length=2, max_length=150)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    pack_size: Optional[int] = Field(None, ge=1, le=10000)
    reorder_level: Optional[int] = Field(None, ge=0, le=100000)
    hsn_code: Optional[str] = Field(None, max_length=20)
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
