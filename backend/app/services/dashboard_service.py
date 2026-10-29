from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.medicine import Medicine
from app.models.batch import Batch
from app.models.bill import Bill, BillItem, PaymentMode, PaymentStatus
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.department import Department
from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus
from app.schemas.dashboard import (
    DashboardKPIs,
    DeptConsumptionData,
    StockTrendPoint,
    BillSummaryItem,
    ExpiringBatchSummary,
    LowStockMedicineSummary,
    DeptRequisitionSummary,
)


class DashboardService:
    @staticmethod
    async def get_kpis(db: AsyncSession, current_user: Optional[User] = None) -> DashboardKPIs:
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

        # 3. Low-stock count & watchlist
        meds_stmt = select(Medicine).where(Medicine.is_active.is_(True))
        meds_res = await db.execute(meds_stmt)
        all_meds = meds_res.scalars().all()

        low_stock_count = 0
        low_stock_medicines: List[LowStockMedicineSummary] = []
        for m in all_meds:
            stock_q = select(func.coalesce(func.sum(Batch.quantity_available), 0)).where(
                and_(Batch.medicine_id == m.id, Batch.expiry_date > today)
            )
            stock_res = await db.execute(stock_q)
            curr_stock = int(stock_res.scalar() or 0)
            if curr_stock <= m.reorder_level:
                low_stock_count += 1
                if len(low_stock_medicines) < 8:
                    low_stock_medicines.append(
                        LowStockMedicineSummary(
                            id=m.id,
                            name=m.name,
                            generic_name=m.generic_name,
                            category=m.category,
                            current_stock=curr_stock,
                            reorder_level=m.reorder_level,
                        )
                    )

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

        # 7. Today's collections by payment mode
        pay_mode_q = select(
            Bill.payment_mode,
            func.coalesce(func.sum(Bill.net_amount), 0.0)
        ).where(
            and_(
                Bill.bill_date >= start_of_today,
                Bill.payment_status == PaymentStatus.PAID,
            )
        ).group_by(Bill.payment_mode)
        pay_mode_res = await db.execute(pay_mode_q)
        pay_mode_dict = {row[0]: float(row[1] or 0.0) for row in pay_mode_res.all()}
        today_cash_total = round(pay_mode_dict.get(PaymentMode.CASH, 0.0), 2)
        today_upi_total = round(pay_mode_dict.get(PaymentMode.UPI, 0.0), 2)
        today_card_total = round(pay_mode_dict.get(PaymentMode.CARD, 0.0), 2)
        today_insurance_total = round(pay_mode_dict.get(PaymentMode.INSURANCE, 0.0), 2)

        # 8. Pending purchase orders
        pending_po_q = select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.status.in_([POStatus.ORDERED, POStatus.PARTIALLY_RECEIVED])
        )
        pending_po_res = await db.execute(pending_po_q)
        pending_purchase_orders = pending_po_res.scalar() or 0

        # 9. Department issues counts by status
        issue_counts_q = select(
            DepartmentIssue.status,
            func.count(DepartmentIssue.id)
        ).group_by(DepartmentIssue.status)
        issue_counts_res = await db.execute(issue_counts_q)
        issue_status_dict = {row[0]: int(row[1] or 0) for row in issue_counts_res.all()}
        pending_department_issues = issue_status_dict.get(IssueStatus.PENDING, 0)
        approved_department_issues = issue_status_dict.get(IssueStatus.APPROVED, 0)
        issued_department_issues = issue_status_dict.get(IssueStatus.ISSUED, 0)

        # 10. Top 5 departments by consumption
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

        # 11. Stock trends for past 7 days (Daily stock in vs out)
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

        # 12. Recent bills (Latest 8 bills)
        recent_bills_q = (
            select(Bill)
            .options(selectinload(Bill.patient))
            .order_by(Bill.bill_date.desc())
            .limit(8)
        )
        recent_bills_res = await db.execute(recent_bills_q)
        recent_bills = [
            BillSummaryItem(
                id=b.id,
                bill_number=b.bill_number,
                patient_name=b.patient.name if b.patient else "Walk-in Patient",
                patient_phone=b.patient.phone if b.patient else None,
                bill_date=b.bill_date,
                net_amount=b.net_amount,
                payment_mode=b.payment_mode.value if hasattr(b.payment_mode, "value") else str(b.payment_mode),
                payment_status=b.payment_status.value if hasattr(b.payment_status, "value") else str(b.payment_status),
            )
            for b in recent_bills_res.scalars().all()
        ]

        # 13. Expiring batches list (Top 8 candidate FEFO batches)
        exp_list_q = (
            select(Batch)
            .options(selectinload(Batch.medicine))
            .where(
                and_(
                    Batch.quantity_available > 0,
                    Batch.expiry_date >= today,
                    Batch.expiry_date <= thirty_days_later,
                )
            )
            .order_by(Batch.expiry_date.asc())
            .limit(8)
        )
        exp_list_res = await db.execute(exp_list_q)
        expiring_batches_list = [
            ExpiringBatchSummary(
                id=b.id,
                batch_number=b.batch_number,
                medicine_name=b.medicine.name if b.medicine else "Unknown Drug",
                expiry_date=b.expiry_date.isoformat(),
                days_to_expiry=(b.expiry_date - today).days,
                quantity_available=b.quantity_available,
                mrp=b.mrp,
            )
            for b in exp_list_res.scalars().all()
        ]

        # 14. Recent department requisitions (Top 8)
        recent_req_q = (
            select(DepartmentIssue)
            .options(selectinload(DepartmentIssue.department), selectinload(DepartmentIssue.items))
            .order_by(DepartmentIssue.created_at.desc())
            .limit(8)
        )
        recent_req_res = await db.execute(recent_req_q)
        recent_requisitions = [
            DeptRequisitionSummary(
                id=req.id,
                issue_number=req.issue_number,
                department_name=req.department.name if req.department else "Ward / Dept",
                requested_by=req.requested_by,
                status=req.status.value if hasattr(req.status, "value") else str(req.status),
                items_count=len(req.items),
                issue_date=req.issue_date,
            )
            for req in recent_req_res.scalars().all()
        ]

        return DashboardKPIs(
            role=current_user.role.value if current_user and hasattr(current_user.role, "value") else (str(current_user.role) if current_user else None),
            user_name=current_user.full_name if current_user else None,
            total_active_medicines=total_active_medicines,
            total_stock_value=total_stock_value,
            low_stock_count=low_stock_count,
            expiring_soon_count=expiring_soon_count,
            expired_count=expired_count,
            today_billing_total=today_billing_total,
            today_bills_count=today_bills_count,
            today_cash_total=today_cash_total,
            today_upi_total=today_upi_total,
            today_card_total=today_card_total,
            today_insurance_total=today_insurance_total,
            pending_purchase_orders=pending_purchase_orders,
            pending_department_issues=pending_department_issues,
            approved_department_issues=approved_department_issues,
            issued_department_issues=issued_department_issues,
            top_departments_consumption=top_departments,
            stock_trends=stock_trends,
            recent_bills=recent_bills,
            expiring_batches_list=expiring_batches_list,
            low_stock_medicines=low_stock_medicines,
            recent_requisitions=recent_requisitions,
        )


dashboard_service = DashboardService()
