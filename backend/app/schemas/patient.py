from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.patient import PatientType


class PatientBase(BaseModel):
    uhid: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., min_length=1, max_length=20)
    phone: str = Field(..., pattern=r"^\d{10}$", description="10-digit mobile number")
    address: Optional[str] = None
    patient_type: PatientType = PatientType.OPD


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, min_length=1, max_length=20)
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$", description="10-digit mobile number")
    address: Optional[str] = None
    patient_type: Optional[PatientType] = None


class PatientOut(PatientBase):
    id: int
    created_at: datetime
    bills_count: int = 0

    class Config:
        from_attributes = True
