from datetime import date
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.bill import PaymentStatus
from app.schemas.reports import (
    StockReportItem,
    ExpiryReportItem,
    SalesReportItem,
    PurchaseReportItem,
    ConsumptionReportItem,
    StockMovementLedgerItem,
)
from app.services.report_service import report_service

router = APIRouter()


@router.get("/stock", response_model=List[StockReportItem])
async def get_stock_report(
    category: Optional[str] = None,
    medicine_id: Optional[int] = None,
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_stock_report(db, category=category, medicine_id=medicine_id)
    if export_format == "csv":
        headers = [
            "Medicine", "Generic Name", "Category", "Unit", "Pack Size",
            "Batch No", "Available Qty", "Cost Price", "MRP", "Cost Value", "MRP Value", "Expiry Date", "Status"
        ]
        rows = [
            [
                item.medicine_name, item.generic_name, item.category, item.unit, str(item.pack_size),
                item.batch_number, str(item.quantity_available), f"{item.unit_cost_price:.2f}",
                f"{item.mrp:.2f}", f"{item.total_cost_value:.2f}", f"{item.total_mrp_value:.2f}",
                str(item.expiry_date), item.status
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=stock_report.csv"})
    return data


@router.get("/expiry", response_model=List[ExpiryReportItem])
async def get_expiry_report(
    days_window: int = Query(90, ge=1, le=365),
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_expiry_report(db, days_window=days_window)
    if export_format == "csv":
        headers = ["Medicine", "Category", "Batch No", "Available Qty", "Cost Price", "MRP", "Expiry Date", "Days Remaining", "Status"]
        rows = [
            [
                item.medicine_name, item.category, item.batch_number, str(item.quantity_available),
                f"{item.unit_cost_price:.2f}", f"{item.mrp:.2f}", str(item.expiry_date),
                str(item.days_to_expiry), item.status
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=expiry_report.csv"})
    return data


@router.get("/sales", response_model=List[SalesReportItem])
async def get_sales_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    payment_status: Optional[PaymentStatus] = None,
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_sales_report(db, start_date=start_date, end_date=end_date, payment_status=payment_status)
    if export_format == "csv":
        headers = ["Bill Number", "Date", "Patient Name", "UHID", "Type", "Payment Mode", "Status", "Subtotal", "Discount", "Tax", "Net Amount"]
        rows = [
            [
                item.bill_number, item.bill_date.strftime("%Y-%m-%d %H:%M"), item.patient_name,
                item.patient_uhid, item.patient_type, item.payment_mode, item.payment_status,
                f"{item.subtotal:.2f}", f"{item.discount:.2f}", f"{item.tax:.2f}", f"{item.net_amount:.2f}"
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sales_report.csv"})
    return data


@router.get("/purchase", response_model=List[PurchaseReportItem])
async def get_purchase_report(
    supplier_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_purchase_report(db, supplier_id=supplier_id, start_date=start_date, end_date=end_date)
    if export_format == "csv":
        headers = ["PO Number", "Supplier", "Order Date", "Expected Date", "Status", "Total Amount", "Items Count", "Received Items"]
        rows = [
            [
                item.po_number, item.supplier_name, str(item.order_date),
                str(item.expected_date or "-"), item.status, f"{item.total_amount:.2f}",
                str(item.items_count), str(item.received_items_count)
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=purchase_report.csv"})
    return data


@router.get("/consumption", response_model=List[ConsumptionReportItem])
async def get_consumption_report(
    department_id: Optional[int] = None,
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_consumption_report(db, department_id=department_id)
    if export_format == "csv":
        headers = ["Department", "Medicine", "Category", "Units Issued", "Issues Count", "Last Issued Date"]
        rows = [
            [
                item.department_name, item.medicine_name, item.category, str(item.total_quantity_issued),
                str(item.issues_count), item.last_issued_date.strftime("%Y-%m-%d %H:%M") if item.last_issued_date else "-"
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=department_consumption_report.csv"})
    return data


@router.get("/ledger", response_model=List[StockMovementLedgerItem])
async def get_stock_movement_ledger(
    medicine_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    export_format: Optional[str] = Query(None, alias="format"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    data = await report_service.get_stock_movement_ledger(db, medicine_id=medicine_id, limit=limit)
    if export_format == "csv":
        headers = ["Timestamp", "Type", "Medicine", "Batch", "Qty In", "Qty Out", "Reference", "Notes", "Performed By"]
        rows = [
            [
                item.timestamp.strftime("%Y-%m-%d %H:%M"), item.movement_type, item.medicine_name,
                item.batch_number, str(item.quantity_in), str(item.quantity_out), item.reference_id,
                item.notes or "-", item.performed_by or "-"
            ]
            for item in data
        ]
        csv_content = report_service.export_csv(headers, rows)
        return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=stock_movement_ledger.csv"})
    return data
