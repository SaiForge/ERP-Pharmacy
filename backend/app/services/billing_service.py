import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bill import Bill, BillItem, PaymentStatus
from app.models.patient import Patient
from app.schemas.bill import BillCreate
from app.services.inventory_service import inventory_service


class BillingService:
    @staticmethod
    async def create_bill(db: AsyncSession, bill_in: BillCreate, user_id: int) -> Bill:
        # Validate patient
        pat_stmt = select(Patient).where(Patient.id == bill_in.patient_id)
        pat_res = await db.execute(pat_stmt)
        patient = pat_res.scalar_one_or_none()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {bill_in.patient_id} not found",
            )

        # Generate unique bill number
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        short_id = uuid.uuid4().hex[:6].upper()
        bill_number = f"BILL-{date_str}-{short_id}"

        # Deduct stock for all items using FEFO
        bill_items: List[BillItem] = []
        subtotal: float = 0.0

        for item_in in bill_in.items:
            deductions = await inventory_service.deduct_stock_fefo(
                db=db,
                medicine_id=item_in.medicine_id,
                requested_qty=item_in.quantity,
                preferred_batch_id=item_in.batch_id,
            )

            for ded in deductions:
                # If unit_price overridden in input, use it, else use batch MRP
                unit_price = item_in.unit_price if item_in.unit_price is not None else ded["unit_price"]
                line_total = round(unit_price * ded["quantity"], 2)
                subtotal += line_total

                bill_item = BillItem(
                    medicine_id=item_in.medicine_id,
                    batch_id=ded["batch_id"],
                    quantity=ded["quantity"],
                    unit_price=unit_price,
                    line_total=line_total,
                )
                bill_items.append(bill_item)

        subtotal = round(subtotal, 2)
        discount = round(bill_in.discount, 2)
        tax = round(bill_in.tax, 2)
        net_amount = round(max(0.0, (subtotal - discount) + tax), 2)

        bill = Bill(
            bill_number=bill_number,
            patient_id=bill_in.patient_id,
            bill_date=datetime.now(timezone.utc),
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            net_amount=net_amount,
            payment_mode=bill_in.payment_mode,
            payment_status=bill_in.payment_status,
            created_by=user_id,
            items=bill_items,
        )
        db.add(bill)
        await db.flush()
        await db.commit()
        
        stmt = (
            select(Bill)
            .where(Bill.id == bill.id)
            .options(selectinload(Bill.items), selectinload(Bill.patient))
        )
        res = await db.execute(stmt)
        return res.scalar_one()

    @staticmethod
    async def refund_bill(db: AsyncSession, bill_id: int, user_id: int) -> Bill:
        stmt = (
            select(Bill)
            .where(Bill.id == bill_id)
            .options(selectinload(Bill.items), selectinload(Bill.patient))
        )
        res = await db.execute(stmt)
        bill = res.scalar_one_or_none()
        if not bill:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bill with ID {bill_id} not found",
            )

        if bill.payment_status == PaymentStatus.REFUNDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bill is already refunded/voided",
            )

        # Restore stock to originating batches
        for item in bill.items:
            await inventory_service.restore_stock(
                db=db,
                batch_id=item.batch_id,
                quantity=item.quantity,
            )

        bill.payment_status = PaymentStatus.REFUNDED
        await db.commit()
        await db.refresh(bill)
        return bill


billing_service = BillingService()
