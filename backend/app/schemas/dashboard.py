from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class DeptConsumptionData(BaseModel):
    department_name: str
    units_consumed: int
    total_value: float


class StockTrendPoint(BaseModel):
    date: str
    stock_in: int
    stock_out: int


class BillSummaryItem(BaseModel):
    id: int
    bill_number: str
    patient_name: str
    patient_phone: Optional[str] = None
    bill_date: datetime
    net_amount: float
    payment_mode: str
    payment_status: str


class ExpiringBatchSummary(BaseModel):
    id: int
    batch_number: str
    medicine_name: str
    expiry_date: str
    days_to_expiry: int
    quantity_available: int
    mrp: float


class LowStockMedicineSummary(BaseModel):
    id: int
    name: str
    generic_name: str
    category: str
    current_stock: int
    reorder_level: int


class DeptRequisitionSummary(BaseModel):
    id: int
    issue_number: str
    department_name: str
    requested_by: str
    status: str
    items_count: int
    issue_date: datetime


class DashboardKPIs(BaseModel):
    # Role of requester
    role: Optional[str] = None
    user_name: Optional[str] = None

    # Global / Executive KPIs
    total_active_medicines: int
    total_stock_value: float
    low_stock_count: int
    expiring_soon_count: int
    expired_count: int
    today_billing_total: float
    today_bills_count: int
    pending_purchase_orders: int

    # Billing / Cashier specific KPIs
    today_cash_total: float = 0.0
    today_upi_total: float = 0.0
    today_card_total: float = 0.0
    today_insurance_total: float = 0.0

    # Department issue KPIs
    pending_department_issues: int = 0
    approved_department_issues: int = 0
    issued_department_issues: int = 0

    # Visual Analytics and Lists
    top_departments_consumption: List[DeptConsumptionData] = []
    stock_trends: List[StockTrendPoint] = []
    recent_bills: List[BillSummaryItem] = []
    expiring_batches_list: List[ExpiringBatchSummary] = []
    low_stock_medicines: List[LowStockMedicineSummary] = []
    recent_requisitions: List[DeptRequisitionSummary] = []
