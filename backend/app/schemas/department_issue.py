from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.department_issue import IssueStatus


class IssueItemInput(BaseModel):
    medicine_id: int
    quantity_requested: int = Field(..., ge=1)
    batch_id: Optional[int] = None


class DepartmentIssueCreate(BaseModel):
    department_id: int
    requested_by: str = Field(..., min_length=1, max_length=100)
    items: List[IssueItemInput] = Field(..., min_length=1)


class IssueItemOut(BaseModel):
    id: int
    medicine_id: int
    medicine_name: Optional[str] = None
    batch_id: Optional[int] = None
    batch_number: Optional[str] = None
    quantity_requested: int
    quantity_issued: int

    class Config:
        from_attributes = True


class DepartmentIssueOut(BaseModel):
    id: int
    issue_number: str
    department_id: int
    department_name: Optional[str] = None
    issue_date: datetime
    requested_by: str
    approved_by: Optional[int] = None
    approved_by_name: Optional[str] = None
    status: IssueStatus
    created_at: datetime
    updated_at: datetime
    items: List[IssueItemOut] = []

    class Config:
        from_attributes = True


class IssueStatusUpdate(BaseModel):
    status: IssueStatus
