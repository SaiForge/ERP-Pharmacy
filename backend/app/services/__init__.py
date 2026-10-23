from app.services.inventory_service import inventory_service, InventoryService
from app.services.billing_service import billing_service, BillingService
from app.services.purchase_service import purchase_service, PurchaseService
from app.services.department_issue_service import department_issue_service, DepartmentIssueService
from app.services.dashboard_service import dashboard_service, DashboardService
from app.services.report_service import report_service, ReportService

__all__ = [
    "inventory_service",
    "InventoryService",
    "billing_service",
    "BillingService",
    "purchase_service",
    "PurchaseService",
    "department_issue_service",
    "DepartmentIssueService",
    "dashboard_service",
    "DashboardService",
    "report_service",
    "ReportService",
]
