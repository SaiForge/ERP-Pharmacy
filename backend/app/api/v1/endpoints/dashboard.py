from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardKPIs
from app.services.dashboard_service import dashboard_service

router = APIRouter()


@router.get("/stats", response_model=DashboardKPIs)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    return await dashboard_service.get_kpis(db)
