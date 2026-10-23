from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    medicines,
    batches,
    stock_adjustments,
    suppliers,
    purchase_orders,
    patients,
    bills,
    departments,
    department_issues,
    dashboard,
    reports,
    health,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["Medicines"])
api_router.include_router(batches.router, prefix="/batches", tags=["Batches"])
api_router.include_router(stock_adjustments.router, prefix="/stock-adjustments", tags=["Stock Adjustments"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(bills.router, prefix="/bills", tags=["Bills"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(department_issues.router, prefix="/department-issues", tags=["Department Issues"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
