from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class StockReportItem(BaseModel):
    medicine_id: int
    medicine_name: str
    generic_name: str
    category: str
    unit: str
    pack_size: int
    reorder_level: int
    batch_number: str
    quantity_available: int
    unit_cost_price: float
    mrp: float
    total_cost_value: float
    total_mrp_value: float
    expiry_date: date
    days_to_expiry: int
    status: str  # OK, LOW_STOCK, EXPIRING_SOON, EXPIRED


class ExpiryReportItem(BaseModel):
    medicine_id: int
    medicine_name: str
    category: str
    batch_number: str
    quantity_available: int
    unit_cost_price: float
    mrp: float
    expiry_date: date
    days_to_expiry: int
    status: str  # EXPIRED, EXPIRING_30, EXPIRING_60, EXPIRING_90


class SalesReportItem(BaseModel):
    bill_id: int
    bill_number: str
    bill_date: datetime
    patient_name: str
    patient_uhid: str
    patient_type: str
    payment_mode: str
    payment_status: str
    subtotal: float
    discount: float
    tax: float
    net_amount: float
    items_count: int


class PurchaseReportItem(BaseModel):
    po_id: int
    po_number: str
    supplier_name: str
    order_date: date
    expected_date: Optional[date] = None
    status: str
    total_amount: float
    items_count: int
    received_items_count: int


class ConsumptionReportItem(BaseModel):
    department_id: int
    department_name: str
    medicine_name: str
    category: str
    total_quantity_issued: int
    issues_count: int
    last_issued_date: Optional[datetime] = None


class StockMovementLedgerItem(BaseModel):
    id: str  # compound id
    timestamp: datetime
    movement_type: str  # PURCHASE_RECEIPT, PATIENT_SALE, DEPT_ISSUE, STOCK_ADJUSTMENT, REFUND
    medicine_id: int
    medicine_name: str
    batch_number: str
    quantity_in: int
    quantity_out: int
    reference_id: str  # PO-xxx, BILL-xxx, ISS-xxx, ADJ-xxx
    notes: Optional[str] = None
    performed_by: Optional[str] = None
