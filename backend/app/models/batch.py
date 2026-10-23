from datetime import datetime, date, timezone
from typing import TYPE_CHECKING, List
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.medicine import Medicine
    from app.models.supplier import Supplier
    from app.models.purchase_order import PurchaseOrderItem
    from app.models.stock_adjustment import StockAdjustment
    from app.models.bill import BillItem


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id", ondelete="CASCADE"), index=True, nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    purchase_order_item_id: Mapped[int] = mapped_column(ForeignKey("purchase_order_items.id"), nullable=True)
    
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_available: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unit_cost_price: Mapped[float] = mapped_column(Float, nullable=False)
    mrp: Mapped[float] = mapped_column(Float, nullable=False)  # Maximum Retail Price / Selling Price
    manufacture_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    received_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    medicine: Mapped["Medicine"] = relationship("Medicine", back_populates="batches")
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="batches")
    purchase_order_item: Mapped["PurchaseOrderItem"] = relationship("PurchaseOrderItem", back_populates="batches")
    adjustments: Mapped[List["StockAdjustment"]] = relationship("StockAdjustment", back_populates="batch")
    bill_items: Mapped[List["BillItem"]] = relationship("BillItem", back_populates="batch")
