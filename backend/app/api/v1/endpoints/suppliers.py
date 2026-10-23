import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[SupplierOut])
async def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Supplier).options(selectinload(Supplier.purchase_orders))
    count_stmt = select(func.count(Supplier.id))

    filters = []
    if is_active is not None:
        filters.append(Supplier.is_active == is_active)
    if search:
        search_filter = or_(
            Supplier.name.ilike(f"%{search}%"),
            Supplier.contact_person.ilike(f"%{search}%"),
            Supplier.email.ilike(f"%{search}%"),
            Supplier.phone.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Supplier.name.asc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    suppliers = res.scalars().all()

    items = []
    for s in suppliers:
        orders_count = len(s.purchase_orders)
        spend = sum(po.total_amount for po in s.purchase_orders)
        items.append(
            SupplierOut(
                id=s.id,
                name=s.name,
                contact_person=s.contact_person,
                phone=s.phone,
                email=s.email,
                address=s.address,
                gst_number=s.gst_number,
                is_active=s.is_active,
                created_at=s.created_at,
                total_orders_count=orders_count,
                total_spend=round(spend, 2),
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


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Supplier).where(Supplier.id == supplier_id).options(selectinload(Supplier.purchase_orders))
    res = await db.execute(stmt)
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")

    orders_count = len(s.purchase_orders)
    spend = sum(po.total_amount for po in s.purchase_orders)

    return SupplierOut(
        id=s.id,
        name=s.name,
        contact_person=s.contact_person,
        phone=s.phone,
        email=s.email,
        address=s.address,
        gst_number=s.gst_number,
        is_active=s.is_active,
        created_at=s.created_at,
        total_orders_count=orders_count,
        total_spend=round(spend, 2),
    )


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    supplier_in: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return SupplierOut(
        id=supplier.id,
        name=supplier.name,
        contact_person=supplier.contact_person,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        gst_number=supplier.gst_number,
        is_active=supplier.is_active,
        created_at=supplier.created_at,
        total_orders_count=0,
        total_spend=0.0,
    )


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    stmt = select(Supplier).where(Supplier.id == supplier_id).options(selectinload(Supplier.purchase_orders))
    res = await db.execute(stmt)
    supplier = res.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(supplier, field, val)

    await db.commit()
    await db.refresh(supplier)

    orders_count = len(supplier.purchase_orders)
    spend = sum(po.total_amount for po in supplier.purchase_orders)

    return SupplierOut(
        id=supplier.id,
        name=supplier.name,
        contact_person=supplier.contact_person,
        phone=supplier.phone,
        email=supplier.email,
        address=supplier.address,
        gst_number=supplier.gst_number,
        is_active=supplier.is_active,
        created_at=supplier.created_at,
        total_orders_count=orders_count,
        total_spend=round(spend, 2),
    )


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    stmt = select(Supplier).where(Supplier.id == supplier_id)
    res = await db.execute(stmt)
    supplier = res.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.is_active = False
    await db.commit()
    return None
