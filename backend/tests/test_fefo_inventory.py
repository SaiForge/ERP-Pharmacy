import pytest
from fastapi import HTTPException
from app.services.inventory_service import inventory_service


@pytest.mark.asyncio
async def test_fefo_deducts_earliest_expiry_first(db_session, sample_data):
    medicine = sample_data["medicine"]
    batch1 = sample_data["batch1"]
    batch2 = sample_data["batch2"]

    # Request 15 units (batch1 has 20 units and expires in 10 days, batch2 has 50 units and expires in 90 days)
    deductions = await inventory_service.deduct_stock_fefo(
        db=db_session,
        medicine_id=medicine.id,
        requested_qty=15,
    )

    assert len(deductions) == 1
    assert deductions[0]["batch_id"] == batch1.id
    assert deductions[0]["quantity"] == 15

    # Check updated availability
    await db_session.refresh(batch1)
    await db_session.refresh(batch2)
    assert batch1.quantity_available == 5
    assert batch2.quantity_available == 50


@pytest.mark.asyncio
async def test_fefo_spans_multiple_batches(db_session, sample_data):
    medicine = sample_data["medicine"]
    batch1 = sample_data["batch1"]
    batch2 = sample_data["batch2"]

    # Request 35 units (batch1 only has 20, remaining 15 should come from batch2)
    deductions = await inventory_service.deduct_stock_fefo(
        db=db_session,
        medicine_id=medicine.id,
        requested_qty=35,
    )

    assert len(deductions) == 2
    assert deductions[0]["batch_id"] == batch1.id
    assert deductions[0]["quantity"] == 20
    assert deductions[1]["batch_id"] == batch2.id
    assert deductions[1]["quantity"] == 15

    await db_session.refresh(batch1)
    await db_session.refresh(batch2)
    assert batch1.quantity_available == 0
    assert batch2.quantity_available == 35


@pytest.mark.asyncio
async def test_fefo_ignores_expired_batches(db_session, sample_data):
    medicine = sample_data["medicine"]
    batch_expired = sample_data["batch_expired"]

    # Request 70 units: unexpired stock is 20 + 50 = 70.
    # The expired batch (10 units) must NOT be counted.
    deductions = await inventory_service.deduct_stock_fefo(
        db=db_session,
        medicine_id=medicine.id,
        requested_qty=70,
    )

    assert sum(d["quantity"] for d in deductions) == 70
    await db_session.refresh(batch_expired)
    assert batch_expired.quantity_available == 10  # Untouched!


@pytest.mark.asyncio
async def test_fefo_raises_on_insufficient_stock(db_session, sample_data):
    medicine = sample_data["medicine"]

    # Request 100 units when only 70 valid units exist
    with pytest.raises(HTTPException) as exc_info:
        await inventory_service.deduct_stock_fefo(
            db=db_session,
            medicine_id=medicine.id,
            requested_qty=100,
        )
    assert exc_info.value.status_code == 400
    assert "Insufficient unexpired stock" in exc_info.value.detail
