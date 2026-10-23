from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.patient import PatientType


class PatientBase(BaseModel):
    uhid: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., min_length=1, max_length=20)
    phone: str = Field(..., min_length=1, max_length=50)
    address: Optional[str] = None
    patient_type: PatientType = PatientType.OPD


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    patient_type: Optional[PatientType] = None


class PatientOut(PatientBase):
    id: int
    created_at: datetime
    bills_count: int = 0

    class Config:
        from_attributes = True
