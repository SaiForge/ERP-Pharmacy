import math
from datetime import date, timedelta, datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.medicine import Medicine
from app.models.batch import Batch
from app.schemas.medicine import MedicineCreate, MedicineUpdate, MedicineOut, MedicineWithStock
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[MedicineWithStock])
async def list_medicines(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    manufacturer: Optional[str] = None,
    is_active: Optional[bool] = None,
    low_stock_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    today = date.today()
    soon_cutoff = today + timedelta(days=30)

    stmt = select(Medicine).options(selectinload(Medicine.batches))
    count_stmt = select(func.count(Medicine.id))

    filters = []
    if is_active is not None:
        filters.append(Medicine.is_active == is_active)
    if category:
        filters.append(Medicine.category.ilike(f"%{category}%"))
    if manufacturer:
        filters.append(Medicine.manufacturer.ilike(f"%{manufacturer}%"))
    if search:
        search_filter = or_(
            Medicine.name.ilike(f"%{search}%"),
            Medicine.generic_name.ilike(f"%{search}%"),
            Medicine.category.ilike(f"%{search}%"),
            Medicine.manufacturer.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    # Order by medicine name
    stmt = stmt.order_by(Medicine.name.asc())

    # If low_stock_only, we process all and filter or calculate in memory/subquery
    # Since pharmacy catalog is moderate, let's load matches
    res = await db.execute(stmt)
    all_meds = res.scalars().all()

    enriched_items: List[MedicineWithStock] = []
    for m in all_meds:
        unexpired_batches = [b for b in m.batches if b.quantity_available > 0 and b.expiry_date > today]
        total_stock = sum(b.quantity_available for b in unexpired_batches)
        is_low = total_stock <= m.reorder_level
        has_soon = any(today < b.expiry_date <= soon_cutoff for b in m.batches if b.quantity_available > 0)
        has_exp = any(b.expiry_date <= today for b in m.batches if b.quantity_available > 0)
        earliest_exp = min((b.expiry_date for b in unexpired_batches), default=None)

        if low_stock_only and not is_low:
            continue

        item_dict = {
            "id": m.id,
            "name": m.name,
            "generic_name": m.generic_name,
            "category": m.category,
            "manufacturer": m.manufacturer,
            "unit": m.unit,
            "pack_size": m.pack_size,
            "reorder_level": m.reorder_level,
            "hsn_code": m.hsn_code,
            "is_active": m.is_active,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "total_stock": total_stock,
            "available_batches_count": len(unexpired_batches),
            "is_low_stock": is_low,
            "has_expiring_soon": has_soon,
            "has_expired": has_exp,
            "earliest_expiry": datetime.combine(earliest_exp, datetime.min.time()) if earliest_exp else None,
        }
        enriched_items.append(MedicineWithStock(**item_dict))

    total = len(enriched_items)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    paged_items = enriched_items[(page - 1) * page_size : page * page_size]

    return {
        "items": paged_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/categories", response_model=List[str])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Medicine.category).distinct().order_by(Medicine.category.asc())
    res = await db.execute(stmt)
    return [r[0] for r in res.all() if r[0]]


@router.get("/{medicine_id}", response_model=MedicineWithStock)
async def get_medicine(
    medicine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    today = date.today()
    soon_cutoff = today + timedelta(days=30)

    stmt = select(Medicine).where(Medicine.id == medicine_id).options(selectinload(Medicine.batches))
    res = await db.execute(stmt)
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")

    unexpired_batches = [b for b in m.batches if b.quantity_available > 0 and b.expiry_date > today]
    total_stock = sum(b.quantity_available for b in unexpired_batches)
    earliest_exp = min((b.expiry_date for b in unexpired_batches), default=None)

    return MedicineWithStock(
        id=m.id,
        name=m.name,
        generic_name=m.generic_name,
        category=m.category,
        manufacturer=m.manufacturer,
        unit=m.unit,
        pack_size=m.pack_size,
        reorder_level=m.reorder_level,
        hsn_code=m.hsn_code,
        is_active=m.is_active,
        created_at=m.created_at,
        updated_at=m.updated_at,
        total_stock=total_stock,
        available_batches_count=len(unexpired_batches),
        is_low_stock=total_stock <= m.reorder_level,
        has_expiring_soon=any(today < b.expiry_date <= soon_cutoff for b in m.batches if b.quantity_available > 0),
        has_expired=any(b.expiry_date <= today for b in m.batches if b.quantity_available > 0),
        earliest_expiry=datetime.combine(earliest_exp, datetime.min.time()) if earliest_exp else None,
    )


@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    medicine_in: MedicineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    medicine = Medicine(**medicine_in.model_dump())
    db.add(medicine)
    await db.commit()
    await db.refresh(medicine)
    return medicine


@router.put("/{medicine_id}", response_model=MedicineOut)
async def update_medicine(
    medicine_id: int,
    medicine_in: MedicineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    stmt = select(Medicine).where(Medicine.id == medicine_id)
    res = await db.execute(stmt)
    medicine = res.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    update_data = medicine_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(medicine, field, val)

    await db.commit()
    await db.refresh(medicine)
    return medicine


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medicine(
    medicine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    stmt = select(Medicine).where(Medicine.id == medicine_id)
    res = await db.execute(stmt)
    medicine = res.scalar_one_or_none()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # Soft delete / de-activate or delete
    medicine.is_active = False
    await db.commit()
    return None
