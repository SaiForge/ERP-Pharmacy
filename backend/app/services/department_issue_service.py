import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus
from app.models.department import Department
from app.schemas.department_issue import DepartmentIssueCreate
from app.services.inventory_service import inventory_service


class DepartmentIssueService:
    @staticmethod
    async def create_requisition(
        db: AsyncSession,
        issue_in: DepartmentIssueCreate,
    ) -> DepartmentIssue:
        dept_stmt = select(Department).where(Department.id == issue_in.department_id)
        dept_res = await db.execute(dept_stmt)
        department = dept_res.scalar_one_or_none()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department ID {issue_in.department_id} not found",
            )

        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        short_id = uuid.uuid4().hex[:6].upper()
        issue_number = f"REQ-{date_str}-{short_id}"

        items = [
            IssueItem(
                medicine_id=item.medicine_id,
                batch_id=item.batch_id,
                quantity_requested=item.quantity_requested,
                quantity_issued=0,
            )
            for item in issue_in.items
        ]

        issue = DepartmentIssue(
            issue_number=issue_number,
            department_id=issue_in.department_id,
            issue_date=datetime.now(timezone.utc),
            requested_by=issue_in.requested_by,
            status=IssueStatus.PENDING,
            items=items,
        )
        db.add(issue)
        await db.commit()
        await db.refresh(issue)
        return issue

    @staticmethod
    async def issue_stock(
        db: AsyncSession,
        issue_id: int,
        approved_by_user_id: int,
    ) -> DepartmentIssue:
        stmt = (
            select(DepartmentIssue)
            .where(DepartmentIssue.id == issue_id)
            .options(selectinload(DepartmentIssue.items))
            .with_for_update()
        )
        res = await db.execute(stmt)
        issue = res.scalar_one_or_none()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department issue request {issue_id} not found",
            )

        if issue.status != IssueStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Issue request is already in {issue.status.value} status",
            )

        # For each item, perform FEFO stock deduction
        for item in issue.items:
            deductions = await inventory_service.deduct_stock_fefo(
                db=db,
                medicine_id=item.medicine_id,
                requested_qty=item.quantity_requested,
                preferred_batch_id=item.batch_id,
            )
            # Link primary batch used and mark quantity_issued
            if deductions:
                item.batch_id = deductions[0]["batch_id"]
                item.quantity_issued = sum(d["quantity"] for d in deductions)

        issue.status = IssueStatus.ISSUED
        issue.approved_by = approved_by_user_id
        await db.commit()
        await db.refresh(issue)
        return issue

    @staticmethod
    async def reject_issue(
        db: AsyncSession,
        issue_id: int,
        approved_by_user_id: int,
    ) -> DepartmentIssue:
        stmt = select(DepartmentIssue).where(DepartmentIssue.id == issue_id).with_for_update()
        res = await db.execute(stmt)
        issue = res.scalar_one_or_none()
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department issue request {issue_id} not found",
            )

        if issue.status != IssueStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject issue in {issue.status.value} status",
            )

        issue.status = IssueStatus.REJECTED
        issue.approved_by = approved_by_user_id
        await db.commit()
        await db.refresh(issue)
        return issue


department_issue_service = DepartmentIssueService()
