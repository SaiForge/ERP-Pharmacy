import uuid
from datetime import date, datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.supplier import Supplier
from app.models.batch import Batch
from app.schemas.purchase_order import POCreate, POUpdate, ReceiveGoodsRequest


class PurchaseService:
    @staticmethod
    async def create_purchase_order(db: AsyncSession, po_in: POCreate, user_id: int) -> PurchaseOrder:
        # Check supplier exists
        sup_stmt = select(Supplier).where(Supplier.id == po_in.supplier_id)
        sup_res = await db.execute(sup_stmt)
        supplier = sup_res.scalar_one_or_none()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Supplier ID {po_in.supplier_id} not found",
            )

        date_str = date.today().strftime("%Y%m%d")
        short_id = uuid.uuid4().hex[:6].upper()
        po_number = f"PO-{date_str}-{short_id}"

        total_amount = 0.0
        items = []
        for item in po_in.items:
            line_total = round(item.quantity_ordered * item.unit_price, 2)
            total_amount += line_total
            items.append(
                PurchaseOrderItem(
                    medicine_id=item.medicine_id,
                    quantity_ordered=item.quantity_ordered,
                    quantity_received=0,
                    unit_price=item.unit_price,
                )
            )

        po = PurchaseOrder(
            po_number=po_number,
            supplier_id=po_in.supplier_id,
            order_date=po_in.order_date,
            expected_date=po_in.expected_date,
            status=POStatus.ORDERED,
            total_amount=round(total_amount, 2),
            created_by=user_id,
            items=items,
        )
        db.add(po)
        await db.commit()
        await db.refresh(po)
        return po

    @staticmethod
    async def receive_goods(db: AsyncSession, po_id: int, receive_in: ReceiveGoodsRequest) -> PurchaseOrder:
        stmt = (
            select(PurchaseOrder)
            .where(PurchaseOrder.id == po_id)
            .options(selectinload(PurchaseOrder.items))
            .with_for_update()
        )
        res = await db.execute(stmt)
        po = res.scalar_one_or_none()
        if not po:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase Order {po_id} not found",
            )

        if po.status in [POStatus.CANCELLED, POStatus.RECEIVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot receive goods for PO in {po.status.value} status",
            )

        items_map = {item.id: item for item in po.items}

        for r_item in receive_in.items:
            if r_item.item_id not in items_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"PO item {r_item.item_id} does not belong to PO {po.po_number}",
                )

            po_item = items_map[r_item.item_id]
            remaining_expected = po_item.quantity_ordered - po_item.quantity_received
            if r_item.quantity_receiving > remaining_expected:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Received quantity ({r_item.quantity_receiving}) exceeds remaining ordered ({remaining_expected}) for medicine ID {po_item.medicine_id}",
                )

            cost_price = r_item.unit_cost_price if r_item.unit_cost_price is not None else po_item.unit_price

            # Create new batch in inventory
            batch = Batch(
                medicine_id=po_item.medicine_id,
                batch_number=r_item.batch_number.strip().upper(),
                supplier_id=po.supplier_id,
                purchase_order_item_id=po_item.id,
                quantity_received=r_item.quantity_receiving,
                quantity_available=r_item.quantity_receiving,
                unit_cost_price=cost_price,
                mrp=r_item.mrp,
                manufacture_date=r_item.manufacture_date,
                expiry_date=r_item.expiry_date,
                received_date=date.today(),
            )
            db.add(batch)

            po_item.quantity_received += r_item.quantity_receiving

        # Update PO status (partial vs full)
        all_fulfilled = all(item.quantity_received >= item.quantity_ordered for item in po.items)
        any_received = any(item.quantity_received > 0 for item in po.items)

        if all_fulfilled:
            po.status = POStatus.RECEIVED
        elif any_received:
            po.status = POStatus.PARTIALLY_RECEIVED

        await db.commit()
        await db.refresh(po)
        return po


purchase_service = PurchaseService()
