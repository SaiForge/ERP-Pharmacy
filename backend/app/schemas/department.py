from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=150)
    department_head: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    department_head: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime
    active_issues_count: int = 0

    class Config:
        from_attributes = True
