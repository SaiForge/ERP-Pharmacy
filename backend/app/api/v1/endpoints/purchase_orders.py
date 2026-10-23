import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.schemas.purchase_order import POCreate, POUpdate, POOut, ReceiveGoodsRequest
from app.schemas.common import PaginatedResponse
from app.services.purchase_service import purchase_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[POOut])
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    supplier_id: Optional[int] = None,
    status_filter: Optional[POStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.creator),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.medicine),
        )
    )
    count_stmt = select(func.count(PurchaseOrder.id))

    if supplier_id:
        stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
        count_stmt = count_stmt.where(PurchaseOrder.supplier_id == supplier_id)
    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
        count_stmt = count_stmt.where(PurchaseOrder.status == status_filter)
    if search:
        search_filter = or_(
            PurchaseOrder.po_number.ilike(f"%{search}%"),
            PurchaseOrder.supplier.has(func.lower(PurchaseOrder.supplier.property.mapper.class_.name).ilike(f"%{search.lower()}%")),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(PurchaseOrder.order_date.desc(), PurchaseOrder.id.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    orders = res.scalars().all()

    items = []
    for po in orders:
        items.append(
            POOut(
                id=po.id,
                po_number=po.po_number,
                supplier_id=po.supplier_id,
                supplier_name=po.supplier.name if po.supplier else None,
                order_date=po.order_date,
                expected_date=po.expected_date,
                status=po.status,
                total_amount=po.total_amount,
                created_by=po.created_by,
                created_by_name=po.creator.full_name if po.creator else None,
                created_at=po.created_at,
                updated_at=po.updated_at,
                items=[
                    {
                        "id": i.id,
                        "medicine_id": i.medicine_id,
                        "quantity_ordered": i.quantity_ordered,
                        "quantity_received": i.quantity_received,
                        "unit_price": i.unit_price,
                        "medicine_name": i.medicine.name if i.medicine else None,
                        "line_total": round(i.quantity_ordered * i.unit_price, 2),
                    }
                    for i in po.items
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


@router.get("/{po_id}", response_model=POOut)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id)
        .options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.creator),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.medicine),
        )
    )
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    return POOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name if po.supplier else None,
        order_date=po.order_date,
        expected_date=po.expected_date,
        status=po.status,
        total_amount=po.total_amount,
        created_by=po.created_by,
        created_by_name=po.creator.full_name if po.creator else None,
        created_at=po.created_at,
        updated_at=po.updated_at,
        items=[
            {
                "id": i.id,
                "medicine_id": i.medicine_id,
                "quantity_ordered": i.quantity_ordered,
                "quantity_received": i.quantity_received,
                "unit_price": i.unit_price,
                "medicine_name": i.medicine.name if i.medicine else None,
                "line_total": round(i.quantity_ordered * i.unit_price, 2),
            }
            for i in po.items
        ],
    )


@router.post("", response_model=POOut, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    po_in: POCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    po = await purchase_service.create_purchase_order(
        db=db,
        po_in=po_in,
        user_id=current_user.id,
    )
    return await get_purchase_order(po.id, db, current_user)


@router.post("/{po_id}/receive", response_model=POOut)
async def receive_goods(
    po_id: int,
    receive_in: ReceiveGoodsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    po = await purchase_service.receive_goods(
        db=db,
        po_id=po_id,
        receive_in=receive_in,
    )
    return await get_purchase_order(po.id, db, current_user)


@router.patch("/{po_id}/cancel", response_model=POOut)
async def cancel_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
) -> Any:
    stmt = select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status in [POStatus.RECEIVED, POStatus.PARTIALLY_RECEIVED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a partially or fully received purchase order")

    po.status = POStatus.CANCELLED
    await db.commit()
    return await get_purchase_order(po.id, db, current_user)
