import math
from datetime import date, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.batch import Batch
from app.models.medicine import Medicine
from app.models.supplier import Supplier
from app.schemas.batch import BatchCreate, BatchUpdate, BatchOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[BatchOut])
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    medicine_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    available_only: bool = False,
    expiring_soon_only: bool = False,
    expired_only: bool = False,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    today = date.today()
    soon_cutoff = today + timedelta(days=30)

    stmt = select(Batch).options(selectinload(Batch.medicine), selectinload(Batch.supplier))
    count_stmt = select(func.count(Batch.id))

    filters = []
    if medicine_id:
        filters.append(Batch.medicine_id == medicine_id)
    if supplier_id:
        filters.append(Batch.supplier_id == supplier_id)
    if available_only:
        filters.append(Batch.quantity_available > 0)
    if expiring_soon_only:
        filters.append(
            and_(
                Batch.quantity_available > 0,
                Batch.expiry_date >= today,
                Batch.expiry_date <= soon_cutoff,
            )
        )
    if expired_only:
        filters.append(
            and_(
                Batch.quantity_available > 0,
                Batch.expiry_date < today,
            )
        )
    if search:
        search_filter = or_(
            Batch.batch_number.ilike(f"%{search}%"),
            Batch.medicine.has(Medicine.name.ilike(f"%{search}%")),
        )
        filters.append(search_filter)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Batch.expiry_date.asc(), Batch.id.asc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    batches = res.scalars().all()

    items = []
    for b in batches:
        days = (b.expiry_date - today).days
        is_exp = days < 0
        is_soon = not is_exp and days <= 30
        items.append(
            BatchOut(
                id=b.id,
                medicine_id=b.medicine_id,
                batch_number=b.batch_number,
                supplier_id=b.supplier_id,
                purchase_order_item_id=b.purchase_order_item_id,
                quantity_received=b.quantity_received,
                quantity_available=b.quantity_available,
                unit_cost_price=b.unit_cost_price,
                mrp=b.mrp,
                manufacture_date=b.manufacture_date,
                expiry_date=b.expiry_date,
                received_date=b.received_date,
                created_at=b.created_at,
                medicine_name=b.medicine.name if b.medicine else None,
                supplier_name=b.supplier.name if b.supplier else None,
                is_expired=is_exp,
                is_expiring_soon=is_soon,
                days_to_expiry=days,
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


@router.post("", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_in: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    # Verify medicine exists
    med_stmt = select(Medicine).where(Medicine.id == batch_in.medicine_id)
    med_res = await db.execute(med_stmt)
    medicine = med_res.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    batch = Batch(**batch_in.model_dump())
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    today = date.today()
    days = (batch.expiry_date - today).days
    return BatchOut(
        id=batch.id,
        medicine_id=batch.medicine_id,
        batch_number=batch.batch_number,
        supplier_id=batch.supplier_id,
        purchase_order_item_id=batch.purchase_order_item_id,
        quantity_received=batch.quantity_received,
        quantity_available=batch.quantity_available,
        unit_cost_price=batch.unit_cost_price,
        mrp=batch.mrp,
        manufacture_date=batch.manufacture_date,
        expiry_date=batch.expiry_date,
        received_date=batch.received_date,
        created_at=batch.created_at,
        medicine_name=medicine.name,
        supplier_name=None,
        is_expired=days < 0,
        is_expiring_soon=days >= 0 and days <= 30,
        days_to_expiry=days,
    )
