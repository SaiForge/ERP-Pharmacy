from datetime import date, datetime, timedelta, timezone
from typing import List
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medicine import Medicine
from app.models.batch import Batch
from app.models.bill import Bill, BillItem, PaymentStatus
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.department import Department
from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus
from app.schemas.dashboard import DashboardKPIs, DeptConsumptionData, StockTrendPoint


class DashboardService:
    @staticmethod
    async def get_kpis(db: AsyncSession) -> DashboardKPIs:
        today = date.today()
        thirty_days_later = today + timedelta(days=30)
        start_of_today = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)

        # 1. Total active medicines
        med_count_query = select(func.count(Medicine.id)).where(Medicine.is_active.is_(True))
        med_count_res = await db.execute(med_count_query)
        total_active_medicines = med_count_res.scalar() or 0

        # 2. Total stock value
        stock_val_query = select(
            func.coalesce(func.sum(Batch.quantity_available * Batch.unit_cost_price), 0.0)
        ).where(Batch.quantity_available > 0)
        stock_val_res = await db.execute(stock_val_query)
        total_stock_value = round(float(stock_val_res.scalar() or 0.0), 2)

        # 3. Low-stock count
        # Medicine has low stock if total available across batches <= reorder_level
        meds_stmt = select(Medicine).where(Medicine.is_active.is_(True))
        meds_res = await db.execute(meds_stmt)
        all_meds = meds_res.scalars().all()

        low_stock_count = 0
        for m in all_meds:
            stock_q = select(func.coalesce(func.sum(Batch.quantity_available), 0)).where(
                and_(Batch.medicine_id == m.id, Batch.expiry_date > today)
            )
            stock_res = await db.execute(stock_q)
            curr_stock = stock_res.scalar() or 0
            if curr_stock <= m.reorder_level:
                low_stock_count += 1

        # 4. Expiring soon count (<= 30 days)
        exp_soon_q = select(func.count(Batch.id)).where(
            and_(
                Batch.quantity_available > 0,
                Batch.expiry_date >= today,
                Batch.expiry_date <= thirty_days_later,
            )
        )
        exp_soon_res = await db.execute(exp_soon_q)
        expiring_soon_count = exp_soon_res.scalar() or 0

        # 5. Expired count
        exp_q = select(func.count(Batch.id)).where(
            and_(
                Batch.quantity_available > 0,
                Batch.expiry_date < today,
            )
        )
        exp_res = await db.execute(exp_q)
        expired_count = exp_res.scalar() or 0

        # 6. Today's billing total & count
        bills_today_q = select(
            func.coalesce(func.sum(Bill.net_amount), 0.0),
            func.count(Bill.id)
        ).where(
            and_(
                Bill.bill_date >= start_of_today,
                Bill.payment_status == PaymentStatus.PAID,
            )
        )
        bills_today_res = await db.execute(bills_today_q)
        today_billing_total, today_bills_count = bills_today_res.one()
        today_billing_total = round(float(today_billing_total or 0.0), 2)

        # 7. Pending purchase orders
        pending_po_q = select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.status.in_([POStatus.ORDERED, POStatus.PARTIALLY_RECEIVED])
        )
        pending_po_res = await db.execute(pending_po_q)
        pending_purchase_orders = pending_po_res.scalar() or 0

        # 8. Top 5 departments by consumption
        dept_q = (
            select(
                Department.name,
                func.coalesce(func.sum(IssueItem.quantity_issued), 0).label("total_units"),
                func.coalesce(func.sum(IssueItem.quantity_issued * Batch.unit_cost_price), 0.0).label("total_val")
            )
            .join(DepartmentIssue, DepartmentIssue.department_id == Department.id)
            .join(IssueItem, IssueItem.issue_id == DepartmentIssue.id)
            .outerjoin(Batch, Batch.id == IssueItem.batch_id)
            .where(DepartmentIssue.status == IssueStatus.ISSUED)
            .group_by(Department.name)
            .order_by(func.sum(IssueItem.quantity_issued).desc())
            .limit(5)
        )
        dept_res = await db.execute(dept_q)
        top_departments = [
            DeptConsumptionData(
                department_name=row[0],
                units_consumed=int(row[1] or 0),
                total_value=round(float(row[2] or 0.0), 2),
            )
            for row in dept_res.all()
        ]

        # 9. Stock trends for past 7 days (Daily stock in vs out)
        stock_trends: List[StockTrendPoint] = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
            day_end = datetime.combine(day, datetime.max.time()).replace(tzinfo=timezone.utc)

            # Stock In (batches received on that date)
            in_q = select(func.coalesce(func.sum(Batch.quantity_received), 0)).where(
                Batch.received_date == day
            )
            in_res = await db.execute(in_q)
            stock_in = in_res.scalar() or 0

            # Stock Out (bills + dept issues on that date)
            billed_q = select(func.coalesce(func.sum(BillItem.quantity), 0)).join(Bill).where(
                and_(Bill.bill_date >= day_start, Bill.bill_date <= day_end)
            )
            billed_res = await db.execute(billed_q)
            billed_qty = billed_res.scalar() or 0

            issued_q = select(func.coalesce(func.sum(IssueItem.quantity_issued), 0)).join(DepartmentIssue).where(
                and_(
                    DepartmentIssue.issue_date >= day_start,
                    DepartmentIssue.issue_date <= day_end,
                    DepartmentIssue.status == IssueStatus.ISSUED,
                )
            )
            issued_res = await db.execute(issued_q)
            issued_qty = issued_res.scalar() or 0

            stock_trends.append(
                StockTrendPoint(
                    date=day.strftime("%b %d"),
                    stock_in=stock_in,
                    stock_out=billed_qty + issued_qty,
                )
            )

        return DashboardKPIs(
            total_active_medicines=total_active_medicines,
            total_stock_value=total_stock_value,
            low_stock_count=low_stock_count,
            expiring_soon_count=expiring_soon_count,
            expired_count=expired_count,
            today_billing_total=today_billing_total,
            today_bills_count=today_bills_count,
            pending_purchase_orders=pending_purchase_orders,
            top_departments_consumption=top_departments,
            stock_trends=stock_trends,
        )


dashboard_service = DashboardService()
