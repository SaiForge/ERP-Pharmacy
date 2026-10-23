from app.schemas.common import PaginatedResponse
from app.schemas.user import UserCreate, UserUpdate, UserOut, Token, LoginRequest
from app.schemas.medicine import MedicineCreate, MedicineUpdate, MedicineOut, MedicineWithStock
from app.schemas.batch import BatchCreate, BatchUpdate, BatchOut
from app.schemas.stock_adjustment import StockAdjustmentCreate, StockAdjustmentOut
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut
from app.schemas.purchase_order import (
    POCreate,
    POUpdate,
    POOut,
    POItemCreate,
    POItemOut,
    ReceiveGoodsRequest,
    ReceiveItemInput,
)
from app.schemas.patient import PatientCreate, PatientUpdate, PatientOut
from app.schemas.bill import BillCreate, BillOut, BillItemInput, BillItemOut
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.department_issue import (
    DepartmentIssueCreate,
    DepartmentIssueOut,
    IssueItemInput,
    IssueItemOut,
    IssueStatusUpdate,
)
from app.schemas.dashboard import DashboardKPIs, DeptConsumptionData, StockTrendPoint
from app.schemas.reports import (
    StockReportItem,
    ExpiryReportItem,
    SalesReportItem,
    PurchaseReportItem,
    ConsumptionReportItem,
    StockMovementLedgerItem,
)

__all__ = [
    "PaginatedResponse",
    "UserCreate",
    "UserUpdate",
    "UserOut",
    "Token",
    "LoginRequest",
    "MedicineCreate",
    "MedicineUpdate",
    "MedicineOut",
    "MedicineWithStock",
    "BatchCreate",
    "BatchUpdate",
    "BatchOut",
    "StockAdjustmentCreate",
    "StockAdjustmentOut",
    "SupplierCreate",
    "SupplierUpdate",
    "SupplierOut",
    "POCreate",
    "POUpdate",
    "POOut",
    "POItemCreate",
    "POItemOut",
    "ReceiveGoodsRequest",
    "ReceiveItemInput",
    "PatientCreate",
    "PatientUpdate",
    "PatientOut",
    "BillCreate",
    "BillOut",
    "BillItemInput",
    "BillItemOut",
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentOut",
    "DepartmentIssueCreate",
    "DepartmentIssueOut",
    "IssueItemInput",
    "IssueItemOut",
    "IssueStatusUpdate",
    "DashboardKPIs",
    "DeptConsumptionData",
    "StockTrendPoint",
    "StockReportItem",
    "ExpiryReportItem",
    "SalesReportItem",
    "PurchaseReportItem",
    "ConsumptionReportItem",
    "StockMovementLedgerItem",
]
