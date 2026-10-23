import pytest
from app.schemas.bill import BillCreate, BillItemInput
from app.models.bill import PaymentMode, PaymentStatus
from app.services.billing_service import billing_service


@pytest.mark.asyncio
async def test_create_bill_and_fefo_deduction(db_session, sample_data):
    patient = sample_data["patient"]
    user = sample_data["user"]
    medicine = sample_data["medicine"]
    batch1 = sample_data["batch1"]

    bill_in = BillCreate(
        patient_id=patient.id,
        discount=5.0,
        tax=2.5,
        payment_mode=PaymentMode.CASH,
        payment_status=PaymentStatus.PAID,
        items=[
            BillItemInput(
                medicine_id=medicine.id,
                quantity=10,
            )
        ],
    )

    bill = await billing_service.create_bill(
        db=db_session,
        bill_in=bill_in,
        user_id=user.id,
    )

    assert bill.id is not None
    assert bill.bill_number.startswith("BILL-")
    assert len(bill.items) == 1
    # 10 units * 10.0 (batch1 MRP) = 100.0 subtotal
    assert bill.subtotal == 100.0
    assert bill.discount == 5.0
    assert bill.tax == 2.5
    assert bill.net_amount == 97.5  # 100 - 5 + 2.5

    # Stock should be deducted from batch1
    await db_session.refresh(batch1)
    assert batch1.quantity_available == 10


@pytest.mark.asyncio
async def test_refund_bill_restores_stock(db_session, sample_data):
    patient = sample_data["patient"]
    user = sample_data["user"]
    medicine = sample_data["medicine"]
    batch1 = sample_data["batch1"]

    initial_stock = batch1.quantity_available

    bill_in = BillCreate(
        patient_id=patient.id,
        items=[
            BillItemInput(
                medicine_id=medicine.id,
                quantity=15,
            )
        ],
    )

    bill = await billing_service.create_bill(
        db=db_session,
        bill_in=bill_in,
        user_id=user.id,
    )
    await db_session.refresh(batch1)
    assert batch1.quantity_available == initial_stock - 15

    # Refund bill
    refunded_bill = await billing_service.refund_bill(
        db=db_session,
        bill_id=bill.id,
        user_id=user.id,
    )

    assert refunded_bill.payment_status == PaymentStatus.REFUNDED
    await db_session.refresh(batch1)
    assert batch1.quantity_available == initial_stock  # Fully restored!
