import pytest
import pytest_asyncio
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.user import User, UserRole
from app.models.medicine import Medicine
from app.models.batch import Batch
from app.models.patient import Patient, PatientType
from app.core.security import get_password_hash

# Use SQLite in-memory with aiosqlite for isolated fast async tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def sample_data(db_session: AsyncSession):
    today = date.today()

    user = User(
        full_name="Test Pharmacist",
        email="test@hpms.hospital",
        hashed_password=get_password_hash("testpass"),
        role=UserRole.PHARMACIST,
        is_active=True,
    )
    db_session.add(user)

    medicine = Medicine(
        name="Amoxicillin 500mg",
        generic_name="Amoxicillin Trihydrate",
        category="Antibiotics",
        manufacturer="Cipla",
        unit="Capsule",
        pack_size=10,
        reorder_level=20,
        is_active=True,
    )
    db_session.add(medicine)

    patient = Patient(
        uhid="UHID-TEST-001",
        name="John Doe",
        age=45,
        gender="Male",
        phone="9999999999",
        patient_type=PatientType.OPD,
    )
    db_session.add(patient)

    await db_session.flush()

    # Batch 1: Expiring in 10 days, qty = 20, MRP = 10.0
    batch1 = Batch(
        medicine_id=medicine.id,
        batch_number="BATCH-EARLY",
        quantity_received=20,
        quantity_available=20,
        unit_cost_price=5.0,
        mrp=10.0,
        manufacture_date=today - timedelta(days=100),
        expiry_date=today + timedelta(days=10),
        received_date=today,
    )

    # Batch 2: Expiring in 90 days, qty = 50, MRP = 12.0
    batch2 = Batch(
        medicine_id=medicine.id,
        batch_number="BATCH-LATER",
        quantity_received=50,
        quantity_available=50,
        unit_cost_price=6.0,
        mrp=12.0,
        manufacture_date=today - timedelta(days=50),
        expiry_date=today + timedelta(days=90),
        received_date=today,
    )

    # Batch 3: Already Expired (yesterday), qty = 10
    batch_expired = Batch(
        medicine_id=medicine.id,
        batch_number="BATCH-EXPIRED",
        quantity_received=10,
        quantity_available=10,
        unit_cost_price=5.0,
        mrp=10.0,
        manufacture_date=today - timedelta(days=400),
        expiry_date=today - timedelta(days=1),
        received_date=today - timedelta(days=300),
    )

    db_session.add_all([batch1, batch2, batch_expired])
    await db_session.commit()

    return {
        "user": user,
        "medicine": medicine,
        "patient": patient,
        "batch1": batch1,
        "batch2": batch2,
        "batch_expired": batch_expired,
    }
