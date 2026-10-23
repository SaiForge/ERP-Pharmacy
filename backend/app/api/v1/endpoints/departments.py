import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.department_issue import DepartmentIssue, IssueStatus
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DepartmentOut])
async def list_departments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Department).options(selectinload(Department.issues))
    count_stmt = select(func.count(Department.id))

    filters = []
    if is_active is not None:
        filters.append(Department.is_active == is_active)
    if search:
        search_filter = or_(
            Department.name.ilike(f"%{search}%"),
            Department.location.ilike(f"%{search}%"),
            Department.department_head.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Department.name.asc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    depts = res.scalars().all()

    items = [
        DepartmentOut(
            id=d.id,
            name=d.name,
            location=d.location,
            department_head=d.department_head,
            is_active=d.is_active,
            created_at=d.created_at,
            active_issues_count=sum(1 for i in d.issues if i.status == IssueStatus.PENDING),
        )
        for d in depts
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{department_id}", response_model=DepartmentOut)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Department).where(Department.id == department_id).options(selectinload(Department.issues))
    res = await db.execute(stmt)
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")

    return DepartmentOut(
        id=d.id,
        name=d.name,
        location=d.location,
        department_head=d.department_head,
        is_active=d.is_active,
        created_at=d.created_at,
        active_issues_count=sum(1 for i in d.issues if i.status == IssueStatus.PENDING),
    )


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    department_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    stmt = select(Department).where(Department.name == department_in.name)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Department with this name already exists")

    dept = Department(**department_in.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)

    return DepartmentOut(
        id=dept.id,
        name=dept.name,
        location=dept.location,
        department_head=dept.department_head,
        is_active=dept.is_active,
        created_at=dept.created_at,
        active_issues_count=0,
    )


@router.put("/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: int,
    department_in: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    stmt = select(Department).where(Department.id == department_id).options(selectinload(Department.issues))
    res = await db.execute(stmt)
    dept = res.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = department_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(dept, field, val)

    await db.commit()
    await db.refresh(dept)

    return DepartmentOut(
        id=dept.id,
        name=dept.name,
        location=dept.location,
        department_head=dept.department_head,
        is_active=dept.is_active,
        created_at=dept.created_at,
        active_issues_count=sum(1 for i in dept.issues if i.status == IssueStatus.PENDING),
    )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    stmt = select(Department).where(Department.id == department_id)
    res = await db.execute(stmt)
    dept = res.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.is_active = False
    await db.commit()
    return None
