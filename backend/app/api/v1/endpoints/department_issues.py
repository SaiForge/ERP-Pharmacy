import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus
from app.schemas.department_issue import DepartmentIssueCreate, DepartmentIssueOut, IssueStatusUpdate
from app.schemas.common import PaginatedResponse
from app.services.department_issue_service import department_issue_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DepartmentIssueOut])
async def list_department_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    status_filter: Optional[IssueStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(DepartmentIssue)
        .options(
            selectinload(DepartmentIssue.department),
            selectinload(DepartmentIssue.approver),
            selectinload(DepartmentIssue.items).selectinload(IssueItem.medicine),
            selectinload(DepartmentIssue.items).selectinload(IssueItem.batch),
        )
    )
    count_stmt = select(func.count(DepartmentIssue.id))

    filters = []
    if department_id:
        filters.append(DepartmentIssue.department_id == department_id)
    if status_filter:
        filters.append(DepartmentIssue.status == status_filter)
    if search:
        search_filter = or_(
            DepartmentIssue.issue_number.ilike(f"%{search}%"),
            DepartmentIssue.requested_by.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(DepartmentIssue.issue_date.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    issues = res.scalars().all()

    items = []
    for iss in issues:
        items.append(
            DepartmentIssueOut(
                id=iss.id,
                issue_number=iss.issue_number,
                department_id=iss.department_id,
                department_name=iss.department.name if iss.department else None,
                issue_date=iss.issue_date,
                requested_by=iss.requested_by,
                approved_by=iss.approved_by,
                approved_by_name=iss.approver.full_name if iss.approver else None,
                status=iss.status,
                created_at=iss.created_at,
                updated_at=iss.updated_at,
                items=[
                    {
                        "id": i.id,
                        "medicine_id": i.medicine_id,
                        "medicine_name": i.medicine.name if i.medicine else None,
                        "batch_id": i.batch_id,
                        "batch_number": i.batch.batch_number if i.batch else None,
                        "quantity_requested": i.quantity_requested,
                        "quantity_issued": i.quantity_issued,
                    }
                    for i in iss.items
                ],
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{issue_id}", response_model=DepartmentIssueOut)
async def get_department_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(DepartmentIssue)
        .where(DepartmentIssue.id == issue_id)
        .options(
            selectinload(DepartmentIssue.department),
            selectinload(DepartmentIssue.approver),
            selectinload(DepartmentIssue.items).selectinload(IssueItem.medicine),
            selectinload(DepartmentIssue.items).selectinload(IssueItem.batch),
        )
    )
    res = await db.execute(stmt)
    iss = res.scalar_one_or_none()
    if not iss:
        raise HTTPException(status_code=404, detail="Department issue not found")

    return DepartmentIssueOut(
        id=iss.id,
        issue_number=iss.issue_number,
        department_id=iss.department_id,
        department_name=iss.department.name if iss.department else None,
        issue_date=iss.issue_date,
        requested_by=iss.requested_by,
        approved_by=iss.approved_by,
        approved_by_name=iss.approver.full_name if iss.approver else None,
        status=iss.status,
        created_at=iss.created_at,
        updated_at=iss.updated_at,
        items=[
            {
                "id": i.id,
                "medicine_id": i.medicine_id,
                "medicine_name": i.medicine.name if i.medicine else None,
                "batch_id": i.batch_id,
                "batch_number": i.batch.batch_number if i.batch else None,
                "quantity_requested": i.quantity_requested,
                "quantity_issued": i.quantity_issued,
            }
            for i in iss.items
        ],
    )


@router.post("", response_model=DepartmentIssueOut, status_code=status.HTTP_201_CREATED)
async def create_requisition(
    issue_in: DepartmentIssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    issue = await department_issue_service.create_requisition(db, issue_in)
    return await get_department_issue(issue.id, db, current_user)


@router.post("/{issue_id}/issue", response_model=DepartmentIssueOut)
async def approve_and_issue_stock(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    issue = await department_issue_service.issue_stock(db, issue_id, current_user.id)
    return await get_department_issue(issue.id, db, current_user)


@router.post("/{issue_id}/reject", response_model=DepartmentIssueOut)
async def reject_issue_request(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    issue = await department_issue_service.reject_issue(db, issue_id, current_user.id)
    return await get_department_issue(issue.id, db, current_user)
