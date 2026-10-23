import math
from datetime import date, datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.bill import Bill, BillItem, PaymentMode, PaymentStatus
from app.models.patient import Patient
from app.schemas.bill import BillCreate, BillOut
from app.schemas.common import PaginatedResponse
from app.services.billing_service import billing_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[BillOut])
async def list_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: Optional[int] = None,
    payment_status: Optional[PaymentStatus] = None,
    payment_mode: Optional[PaymentMode] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(Bill)
        .options(
            selectinload(Bill.patient),
            selectinload(Bill.creator),
            selectinload(Bill.items).selectinload(BillItem.medicine),
            selectinload(Bill.items).selectinload(BillItem.batch),
        )
    )
    count_stmt = select(func.count(Bill.id))

    filters = []
    if patient_id:
        filters.append(Bill.patient_id == patient_id)
    if payment_status:
        filters.append(Bill.payment_status == payment_status)
    if payment_mode:
        filters.append(Bill.payment_mode == payment_mode)
    if start_date:
        s_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        filters.append(Bill.bill_date >= s_dt)
    if end_date:
        e_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        filters.append(Bill.bill_date <= e_dt)
    if search:
        search_filter = or_(
            Bill.bill_number.ilike(f"%{search}%"),
            Bill.patient.has(Patient.name.ilike(f"%{search}%")),
            Bill.patient.has(Patient.uhid.ilike(f"%{search}%")),
            Bill.patient.has(Patient.phone.ilike(f"%{search}%")),
        )
        filters.append(search_filter)

    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Bill.bill_date.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    bills = res.scalars().all()

    items = []
    for b in bills:
        items.append(
            BillOut(
                id=b.id,
                bill_number=b.bill_number,
                patient_id=b.patient_id,
                patient_name=b.patient.name if b.patient else None,
                patient_uhid=b.patient.uhid if b.patient else None,
                patient_phone=b.patient.phone if b.patient else None,
                bill_date=b.bill_date,
                subtotal=b.subtotal,
                discount=b.discount,
                tax=b.tax,
                net_amount=b.net_amount,
                payment_mode=b.payment_mode,
                payment_status=b.payment_status,
                created_by=b.created_by,
                created_by_name=b.creator.full_name if b.creator else None,
                created_at=b.created_at,
                items=[
                    {
                        "id": i.id,
                        "medicine_id": i.medicine_id,
                        "medicine_name": i.medicine.name if i.medicine else None,
                        "batch_id": i.batch_id,
                        "batch_number": i.batch.batch_number if i.batch else None,
                        "expiry_date": str(i.batch.expiry_date) if i.batch else None,
                        "quantity": i.quantity,
                        "unit_price": i.unit_price,
                        "line_total": i.line_total,
                    }
                    for i in b.items
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


@router.get("/{bill_id}", response_model=BillOut)
async def get_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = (
        select(Bill)
        .where(Bill.id == bill_id)
        .options(
            selectinload(Bill.patient),
            selectinload(Bill.creator),
            selectinload(Bill.items).selectinload(BillItem.medicine),
            selectinload(Bill.items).selectinload(BillItem.batch),
        )
    )
    res = await db.execute(stmt)
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bill not found")

    return BillOut(
        id=b.id,
        bill_number=b.bill_number,
        patient_id=b.patient_id,
        patient_name=b.patient.name if b.patient else None,
        patient_uhid=b.patient.uhid if b.patient else None,
        patient_phone=b.patient.phone if b.patient else None,
        bill_date=b.bill_date,
        subtotal=b.subtotal,
        discount=b.discount,
        tax=b.tax,
        net_amount=b.net_amount,
        payment_mode=b.payment_mode,
        payment_status=b.payment_status,
        created_by=b.created_by,
        created_by_name=b.creator.full_name if b.creator else None,
        created_at=b.created_at,
        items=[
            {
                "id": i.id,
                "medicine_id": i.medicine_id,
                "medicine_name": i.medicine.name if i.medicine else None,
                "batch_id": i.batch_id,
                "batch_number": i.batch.batch_number if i.batch else None,
                "expiry_date": str(i.batch.expiry_date) if i.batch else None,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "line_total": i.line_total,
            }
            for i in b.items
        ],
    )


@router.post("", response_model=BillOut, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill_in: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.BILLING_STAFF])),
) -> Any:
    bill = await billing_service.create_bill(
        db=db,
        bill_in=bill_in,
        user_id=current_user.id,
    )
    return await get_bill(bill.id, db, current_user)


@router.post("/{bill_id}/refund", response_model=BillOut)
async def refund_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST])),
) -> Any:
    bill = await billing_service.refund_bill(
        db=db,
        bill_id=bill_id,
        user_id=current_user.id,
    )
    return await get_bill(bill.id, db, current_user)
