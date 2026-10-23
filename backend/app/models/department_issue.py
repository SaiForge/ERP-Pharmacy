import enum
from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.user import User
    from app.models.medicine import Medicine
    from app.models.batch import Batch


class IssueStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    ISSUED = "ISSUED"
    REJECTED = "REJECTED"


class DepartmentIssue(Base):
    __tablename__ = "department_issues"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    issue_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    issue_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    approved_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="issue_status_enum"), default=IssueStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    department: Mapped["Department"] = relationship("Department", back_populates="issues")
    approver: Mapped["User"] = relationship("User")
    items: Mapped[List["IssueItem"]] = relationship(
        "IssueItem", back_populates="issue", cascade="all, delete-orphan"
    )


class IssueItem(Base):
    __tablename__ = "issue_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("department_issues.id", ondelete="CASCADE"), nullable=False)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=True)
    quantity_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_issued: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    issue: Mapped["DepartmentIssue"] = relationship("DepartmentIssue", back_populates="items")
    medicine: Mapped["Medicine"] = relationship("Medicine")
    batch: Mapped["Batch"] = relationship("Batch")
