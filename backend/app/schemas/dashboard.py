from typing import List
from pydantic import BaseModel


class DeptConsumptionData(BaseModel):
    department_name: str
    units_consumed: int
    total_value: float


class StockTrendPoint(BaseModel):
    date: str
    stock_in: int
    stock_out: int


class DashboardKPIs(BaseModel):
    total_active_medicines: int
    total_stock_value: float
    low_stock_count: int
    expiring_soon_count: int
    expired_count: int
    today_billing_total: float
    today_bills_count: int
    pending_purchase_orders: int
    top_departments_consumption: List[DeptConsumptionData]
    stock_trends: List[StockTrendPoint]
