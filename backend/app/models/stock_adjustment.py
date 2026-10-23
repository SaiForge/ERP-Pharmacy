import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.medicine import Medicine
    from app.models.batch import Batch
    from app.models.user import User


class AdjustmentType(str, enum.Enum):
    DAMAGE = "DAMAGE"
    LOSS = "LOSS"
    EXPIRED = "EXPIRED"
    CORRECTION = "CORRECTION"


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=False)
    adjustment_type: Mapped[AdjustmentType] = mapped_column(
        Enum(AdjustmentType, name="adjustment_type_enum"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)  # negative for write-off/deduction, positive for correction up
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    adjusted_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    medicine: Mapped["Medicine"] = relationship("Medicine")
    batch: Mapped["Batch"] = relationship("Batch", back_populates="adjustments")
    user: Mapped["User"] = relationship("User")
