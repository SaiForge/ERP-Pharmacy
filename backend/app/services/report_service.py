import csv
import io
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medicine import Medicine
from app.models.batch import Batch
from app.models.bill import Bill, BillItem, PaymentStatus
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.department import Department
from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus
from app.models.stock_adjustment import StockAdjustment
from app.schemas.reports import (
    StockReportItem,
    ExpiryReportItem,
    SalesReportItem,
    PurchaseReportItem,
    ConsumptionReportItem,
    StockMovementLedgerItem,
)


class ReportService:
    @staticmethod
    async def get_stock_report(
        db: AsyncSession,
        category: Optional[str] = None,
        medicine_id: Optional[int] = None,
    ) -> List[StockReportItem]:
        today = date.today()
        stmt = (
            select(Batch, Medicine)
            .join(Medicine, Medicine.id == Batch.medicine_id)
            .where(Batch.quantity_available > 0)
        )
        if category:
            stmt = stmt.where(Medicine.category == category)
        if medicine_id:
            stmt = stmt.where(Medicine.id == medicine_id)

        stmt = stmt.order_by(Medicine.name.asc(), Batch.expiry_date.asc())
        res = await db.execute(stmt)
        rows = res.all()

        report: List[StockReportItem] = []
        for batch, med in rows:
            days_to_expiry = (batch.expiry_date - today).days
            if days_to_expiry < 0:
                status_str = "EXPIRED"
            elif days_to_expiry <= 30:
                status_str = "EXPIRING_SOON"
            elif batch.quantity_available <= med.reorder_level:
                status_str = "LOW_STOCK"
            else:
                status_str = "NORMAL"

            report.append(
                StockReportItem(
                    medicine_id=med.id,
                    medicine_name=med.name,
                    generic_name=med.generic_name,
                    category=med.category,
                    unit=med.unit,
                    pack_size=med.pack_size,
                    reorder_level=med.reorder_level,
                    batch_number=batch.batch_number,
                    quantity_available=batch.quantity_available,
                    unit_cost_price=batch.unit_cost_price,
                    mrp=batch.mrp,
                    total_cost_value=round(batch.quantity_available * batch.unit_cost_price, 2),
                    total_mrp_value=round(batch.quantity_available * batch.mrp, 2),
                    expiry_date=batch.expiry_date,
                    days_to_expiry=days_to_expiry,
                    status=status_str,
                )
            )
        return report

    @staticmethod
    async def get_expiry_report(
        db: AsyncSession,
        days_window: int = 90,
    ) -> List[ExpiryReportItem]:
        today = date.today()
        cutoff_date = today + timedelta(days=days_window)

        stmt = (
            select(Batch, Medicine)
            .join(Medicine, Medicine.id == Batch.medicine_id)
            .where(
                and_(
                    Batch.quantity_available > 0,
                    Batch.expiry_date <= cutoff_date,
                )
            )
            .order_by(Batch.expiry_date.asc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        report: List[ExpiryReportItem] = []
        for batch, med in rows:
            days = (batch.expiry_date - today).days
            if days < 0:
                status_str = "EXPIRED"
            elif days <= 30:
                status_str = "EXPIRING_30"
            elif days <= 60:
                status_str = "EXPIRING_60"
            else:
                status_str = "EXPIRING_90"

            report.append(
                ExpiryReportItem(
                    medicine_id=med.id,
                    medicine_name=med.name,
                    category=med.category,
                    batch_number=batch.batch_number,
                    quantity_available=batch.quantity_available,
                    unit_cost_price=batch.unit_cost_price,
                    mrp=batch.mrp,
                    expiry_date=batch.expiry_date,
                    days_to_expiry=days,
                    status=status_str,
                )
            )
        return report

    @staticmethod
    async def get_sales_report(
        db: AsyncSession,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        payment_status: Optional[PaymentStatus] = None,
    ) -> List[SalesReportItem]:
        stmt = (
            select(Bill)
            .options(selectinload(Bill.patient), selectinload(Bill.items))
            .order_by(Bill.bill_date.desc())
        )
        if start_date:
            s_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            stmt = stmt.where(Bill.bill_date >= s_dt)
        if end_date:
            e_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            stmt = stmt.where(Bill.bill_date <= e_dt)
        if payment_status:
            stmt = stmt.where(Bill.payment_status == payment_status)

        res = await db.execute(stmt)
        bills = res.scalars().all()

        return [
            SalesReportItem(
                bill_id=b.id,
                bill_number=b.bill_number,
                bill_date=b.bill_date,
                patient_name=b.patient.name if b.patient else "Unknown",
                patient_uhid=b.patient.uhid if b.patient else "-",
                patient_type=b.patient.patient_type.value if b.patient else "OPD",
                payment_mode=b.payment_mode.value,
                payment_status=b.payment_status.value,
                subtotal=b.subtotal,
                discount=b.discount,
                tax=b.tax,
                net_amount=b.net_amount,
                items_count=len(b.items),
            )
            for b in bills
        ]

    @staticmethod
    async def get_purchase_report(
        db: AsyncSession,
        supplier_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[PurchaseReportItem]:
        stmt = (
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.supplier), selectinload(PurchaseOrder.items))
            .order_by(PurchaseOrder.order_date.desc())
        )
        if supplier_id:
            stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
        if start_date:
            stmt = stmt.where(PurchaseOrder.order_date >= start_date)
        if end_date:
            stmt = stmt.where(PurchaseOrder.order_date <= end_date)

        res = await db.execute(stmt)
        orders = res.scalars().all()

        return [
            PurchaseReportItem(
                po_id=po.id,
                po_number=po.po_number,
                supplier_name=po.supplier.name if po.supplier else "Unknown",
                order_date=po.order_date,
                expected_date=po.expected_date,
                status=po.status.value,
                total_amount=po.total_amount,
                items_count=len(po.items),
                received_items_count=sum(1 for i in po.items if i.quantity_received >= i.quantity_ordered),
            )
            for po in orders
        ]

    @staticmethod
    async def get_consumption_report(
        db: AsyncSession,
        department_id: Optional[int] = None,
    ) -> List[ConsumptionReportItem]:
        stmt = (
            select(
                Department.id.label("dept_id"),
                Department.name.label("dept_name"),
                Medicine.name.label("med_name"),
                Medicine.category.label("category"),
                func.sum(IssueItem.quantity_issued).label("total_qty"),
                func.count(DepartmentIssue.id).label("issues_count"),
                func.max(DepartmentIssue.issue_date).label("last_date"),
            )
            .join(DepartmentIssue, DepartmentIssue.department_id == Department.id)
            .join(IssueItem, IssueItem.issue_id == DepartmentIssue.id)
            .join(Medicine, Medicine.id == IssueItem.medicine_id)
            .where(DepartmentIssue.status == IssueStatus.ISSUED)
        )
        if department_id:
            stmt = stmt.where(Department.id == department_id)

        stmt = stmt.group_by(Department.id, Department.name, Medicine.name, Medicine.category)
        stmt = stmt.order_by(Department.name.asc(), func.sum(IssueItem.quantity_issued).desc())

        res = await db.execute(stmt)
        rows = res.all()

        return [
            ConsumptionReportItem(
                department_id=row.dept_id,
                department_name=row.dept_name,
                medicine_name=row.med_name,
                category=row.category,
                total_quantity_issued=int(row.total_qty or 0),
                issues_count=int(row.issues_count or 0),
                last_issued_date=row.last_date,
            )
            for row in rows
        ]

    @staticmethod
    async def get_stock_movement_ledger(
        db: AsyncSession,
        medicine_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[StockMovementLedgerItem]:
        """
        Stock movement ledger across:
        1. Batch receipts (Stock IN)
        2. Billing sales (Stock OUT)
        3. Department Issues (Stock OUT)
        4. Stock Adjustments (IN or OUT)
        """
        ledger: List[StockMovementLedgerItem] = []

        # 1. Batches received
        b_stmt = (
            select(Batch, Medicine)
            .join(Medicine, Medicine.id == Batch.medicine_id)
            .order_by(Batch.created_at.desc())
            .limit(limit)
        )
        if medicine_id:
            b_stmt = b_stmt.where(Batch.medicine_id == medicine_id)
        b_res = await db.execute(b_stmt)
        for batch, med in b_res.all():
            ledger.append(
                StockMovementLedgerItem(
                    id=f"BATCH-{batch.id}",
                    timestamp=batch.created_at,
                    movement_type="PURCHASE_RECEIPT",
                    medicine_id=med.id,
                    medicine_name=med.name,
                    batch_number=batch.batch_number,
                    quantity_in=batch.quantity_received,
                    quantity_out=0,
                    reference_id=f"BATCH#{batch.id}",
                    notes="Stock received into warehouse",
                    performed_by="Pharmacy Staff",
                )
            )

        # 2. Billed items
        bill_stmt = (
            select(BillItem, Bill, Medicine, Batch)
            .join(Bill, Bill.id == BillItem.bill_id)
            .join(Medicine, Medicine.id == BillItem.medicine_id)
            .join(Batch, Batch.id == BillItem.batch_id)
            .order_by(Bill.bill_date.desc())
            .limit(limit)
        )
        if medicine_id:
            bill_stmt = bill_stmt.where(BillItem.medicine_id == medicine_id)
        bill_res = await db.execute(bill_stmt)
        for b_item, bill, med, batch in bill_res.all():
            if bill.payment_status == PaymentStatus.REFUNDED:
                # show refund stock in
                ledger.append(
                    StockMovementLedgerItem(
                        id=f"REFUND-{bill.id}-{b_item.id}",
                        timestamp=bill.bill_date,
                        movement_type="REFUND_RESTORE",
                        medicine_id=med.id,
                        medicine_name=med.name,
                        batch_number=batch.batch_number,
                        quantity_in=b_item.quantity,
                        quantity_out=0,
                        reference_id=bill.bill_number,
                        notes="Bill refunded; stock returned",
                        performed_by=f"User #{bill.created_by}",
                    )
                )
            else:
                ledger.append(
                    StockMovementLedgerItem(
                        id=f"BILL-{bill.id}-{b_item.id}",
                        timestamp=bill.bill_date,
                        movement_type="PATIENT_SALE",
                        medicine_id=med.id,
                        medicine_name=med.name,
                        batch_number=batch.batch_number,
                        quantity_in=0,
                        quantity_out=b_item.quantity,
                        reference_id=bill.bill_number,
                        notes=f"Dispensed to patient ID {bill.patient_id}",
                        performed_by=f"User #{bill.created_by}",
                    )
                )

        # 3. Dept issues
        iss_stmt = (
            select(IssueItem, DepartmentIssue, Medicine, Batch)
            .join(DepartmentIssue, DepartmentIssue.id == IssueItem.issue_id)
            .join(Medicine, Medicine.id == IssueItem.medicine_id)
            .outerjoin(Batch, Batch.id == IssueItem.batch_id)
            .where(DepartmentIssue.status == IssueStatus.ISSUED)
            .order_by(DepartmentIssue.issue_date.desc())
            .limit(limit)
        )
        if medicine_id:
            iss_stmt = iss_stmt.where(IssueItem.medicine_id == medicine_id)
        iss_res = await db.execute(iss_stmt)
        for i_item, issue, med, batch in iss_res.all():
            ledger.append(
                StockMovementLedgerItem(
                    id=f"ISSUE-{issue.id}-{i_item.id}",
                    timestamp=issue.issue_date,
                    movement_type="DEPT_ISSUE",
                    medicine_id=med.id,
                    medicine_name=med.name,
                    batch_number=batch.batch_number if batch else "FEFO",
                    quantity_in=0,
                    quantity_out=i_item.quantity_issued,
                    reference_id=issue.issue_number,
                    notes=f"Issued to Dept ID {issue.department_id}",
                    performed_by=f"User #{issue.approved_by}",
                )
            )

        # 4. Stock adjustments
        adj_stmt = (
            select(StockAdjustment, Medicine, Batch)
            .join(Medicine, Medicine.id == StockAdjustment.medicine_id)
            .join(Batch, Batch.id == StockAdjustment.batch_id)
            .order_by(StockAdjustment.created_at.desc())
            .limit(limit)
        )
        if medicine_id:
            adj_stmt = adj_stmt.where(StockAdjustment.medicine_id == medicine_id)
        adj_res = await db.execute(adj_stmt)
        for adj, med, batch in adj_res.all():
            q_in = adj.quantity if adj.quantity > 0 else 0
            q_out = abs(adj.quantity) if adj.quantity < 0 else 0
            ledger.append(
                StockMovementLedgerItem(
                    id=f"ADJ-{adj.id}",
                    timestamp=adj.created_at,
                    movement_type=f"ADJUST_{adj.adjustment_type.value}",
                    medicine_id=med.id,
                    medicine_name=med.name,
                    batch_number=batch.batch_number,
                    quantity_in=q_in,
                    quantity_out=q_out,
                    reference_id=f"ADJ#{adj.id}",
                    notes=adj.reason,
                    performed_by=f"User #{adj.adjusted_by}",
                )
            )

        # Sort all combined ledger events by timestamp descending
        ledger.sort(key=lambda x: x.timestamp, reverse=True)
        return ledger[:limit]

    @staticmethod
    def export_csv(headers: List[str], rows: List[List[str]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return output.getvalue()


report_service = ReportService()
