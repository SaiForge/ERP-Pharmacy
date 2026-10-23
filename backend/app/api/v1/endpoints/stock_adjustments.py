import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.stock_adjustment import StockAdjustment
from app.schemas.stock_adjustment import StockAdjustmentCreate, StockAdjustmentOut
from app.schemas.common import PaginatedResponse
from app.services.inventory_service import inventory_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[StockAdjustmentOut])
async def list_adjustments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    medicine_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(StockAdjustment)
        .options(
            selectinload(StockAdjustment.medicine),
            selectinload(StockAdjustment.batch),
            selectinload(StockAdjustment.user),
        )
    )
    count_stmt = select(func.count(StockAdjustment.id))

    if medicine_id:
        stmt = stmt.where(StockAdjustment.medicine_id == medicine_id)
        count_stmt = count_stmt.where(StockAdjustment.medicine_id == medicine_id)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(StockAdjustment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    adjustments = res.scalars().all()

    items = [
        StockAdjustmentOut(
            id=a.id,
            medicine_id=a.medicine_id,
            medicine_name=a.medicine.name if a.medicine else None,
            batch_id=a.batch_id,
            batch_number=a.batch.batch_number if a.batch else None,
            adjustment_type=a.adjustment_type,
            quantity=a.quantity,
            reason=a.reason,
            adjusted_by=a.adjusted_by,
            adjusted_by_name=a.user.full_name if a.user else None,
            created_at=a.created_at,
        )
        for a in adjustments
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", response_model=StockAdjustmentOut, status_code=status.HTTP_201_CREATED)
async def create_stock_adjustment(
    adjustment_in: StockAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    adjustment = await inventory_service.adjust_stock(
        db=db,
        medicine_id=adjustment_in.medicine_id,
        batch_id=adjustment_in.batch_id,
        adjustment_type=adjustment_in.adjustment_type,
        quantity_delta=adjustment_in.quantity,
        reason=adjustment_in.reason,
        user_id=current_user.id,
    )
    await db.commit()
    await db.refresh(adjustment)

    # Load relations
    stmt = (
        select(StockAdjustment)
        .where(StockAdjustment.id == adjustment.id)
        .options(
            selectinload(StockAdjustment.medicine),
            selectinload(StockAdjustment.batch),
            selectinload(StockAdjustment.user),
        )
    )
    res = await db.execute(stmt)
    full_adj = res.scalar_one()

    return StockAdjustmentOut(
        id=full_adj.id,
        medicine_id=full_adj.medicine_id,
        medicine_name=full_adj.medicine.name if full_adj.medicine else None,
        batch_id=full_adj.batch_id,
        batch_number=full_adj.batch.batch_number if full_adj.batch else None,
        adjustment_type=full_adj.adjustment_type,
        quantity=full_adj.quantity,
        reason=full_adj.reason,
        adjusted_by=full_adj.adjusted_by,
        adjusted_by_name=full_adj.user.full_name if full_adj.user else None,
        created_at=full_adj.created_at,
    )
