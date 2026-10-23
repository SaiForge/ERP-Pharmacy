from datetime import date
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.batch import Batch
from app.models.medicine import Medicine
from app.models.stock_adjustment import StockAdjustment, AdjustmentType


class InventoryService:
    @staticmethod
    async def deduct_stock_fefo(
        db: AsyncSession,
        medicine_id: int,
        requested_qty: int,
        preferred_batch_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Deducts stock for a medicine following First-Expire-First-Out (FEFO) logic.
        Batches with earlier expiry dates are consumed first.
        Expired batches are excluded from dispensing.
        """
        if requested_qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requested quantity must be greater than zero",
            )

        today = date.today()

        # Check medicine exists
        med_stmt = select(Medicine).where(Medicine.id == medicine_id)
        med_res = await db.execute(med_stmt)
        medicine = med_res.scalar_one_or_none()
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine with ID {medicine_id} not found",
            )

        # If a specific batch was explicitly preferred (e.g. barcode scan of batch)
        if preferred_batch_id:
            batch_stmt = select(Batch).where(
                and_(
                    Batch.id == preferred_batch_id,
                    Batch.medicine_id == medicine_id,
                )
            ).with_for_update()
            batch_res = await db.execute(batch_stmt)
            batch = batch_res.scalar_one_or_none()
            if not batch:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Batch ID {preferred_batch_id} not found for this medicine",
                )
            if batch.expiry_date <= today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch {batch.batch_number} has expired on {batch.expiry_date}",
                )
            if batch.quantity_available < requested_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch {batch.batch_number} only has {batch.quantity_available} units available (requested: {requested_qty})",
                )

            batch.quantity_available -= requested_qty
            return [{
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "quantity": requested_qty,
                "unit_price": batch.mrp,
                "unit_cost_price": batch.unit_cost_price,
                "expiry_date": batch.expiry_date,
            }]

        # Standard FEFO: Query valid unexpired batches ordered by expiry_date ASC, id ASC
        query = (
            select(Batch)
            .where(
                and_(
                    Batch.medicine_id == medicine_id,
                    Batch.quantity_available > 0,
                    Batch.expiry_date > today,
                )
            )
            .order_by(Batch.expiry_date.asc(), Batch.id.asc())
            .with_for_update()
        )
        res = await db.execute(query)
        available_batches = list(res.scalars().all())

        total_available = sum(b.quantity_available for b in available_batches)
        if total_available < requested_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient unexpired stock for '{medicine.name}'. Available: {total_available}, Requested: {requested_qty}",
            )

        deductions: List[Dict[str, Any]] = []
        remaining_to_deduct = requested_qty

        for batch in available_batches:
            if remaining_to_deduct <= 0:
                break

            deduct_amount = min(batch.quantity_available, remaining_to_deduct)
            batch.quantity_available -= deduct_amount
            remaining_to_deduct -= deduct_amount

            deductions.append({
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "quantity": deduct_amount,
                "unit_price": batch.mrp,
                "unit_cost_price": batch.unit_cost_price,
                "expiry_date": batch.expiry_date,
            })

        return deductions

    @staticmethod
    async def restore_stock(db: AsyncSession, batch_id: int, quantity: int) -> Batch:
        """Restores stock back to originating batch upon bill void/refund or reversal"""
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity to restore must be greater than zero",
            )

        stmt = select(Batch).where(Batch.id == batch_id).with_for_update()
        res = await db.execute(stmt)
        batch = res.scalar_one_or_none()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch ID {batch_id} not found for stock restoration",
            )

        batch.quantity_available += quantity
        return batch

    @staticmethod
    async def adjust_stock(
        db: AsyncSession,
        medicine_id: int,
        batch_id: int,
        adjustment_type: AdjustmentType,
        quantity_delta: int,
        reason: str,
        user_id: int,
    ) -> StockAdjustment:
        """
        Record a stock adjustment (damage, loss, expired write-off, count correction).
        quantity_delta can be negative (write-down) or positive (count correction up).
        """
        stmt = select(Batch).where(
            and_(Batch.id == batch_id, Batch.medicine_id == medicine_id)
        ).with_for_update()
        res = await db.execute(stmt)
        batch = res.scalar_one_or_none()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found for specified medicine",
            )

        new_qty = batch.quantity_available + quantity_delta
        if new_qty < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adjustment would result in negative stock ({new_qty}). Available: {batch.quantity_available}",
            )

        batch.quantity_available = new_qty

        adjustment = StockAdjustment(
            medicine_id=medicine_id,
            batch_id=batch_id,
            adjustment_type=adjustment_type,
            quantity=quantity_delta,
            reason=reason,
            adjusted_by=user_id,
        )
        db.add(adjustment)
        await db.flush()
        return adjustment


inventory_service = InventoryService()
