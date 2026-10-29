import pytest
from pydantic import ValidationError
from datetime import date
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate
from app.schemas.supplier import SupplierCreate
from app.schemas.user import UserCreate
from app.services.dashboard_service import dashboard_service


def test_patient_phone_10_digits_constraint():
    # Valid 10 digits
    p = PatientCreate(
        uhid="UHID-VALID-01",
        name="Test Patient",
        age=30,
        gender="Male",
        phone="9876543210",
    )
    assert p.phone == "9876543210"

    # Invalid: 9 digits
    with pytest.raises(ValidationError):
        PatientCreate(
            uhid="UHID-INVALID-01",
            name="Test Patient",
            age=30,
            gender="Male",
            phone="987654321",
        )

    # Invalid: 11 digits
    with pytest.raises(ValidationError):
        PatientCreate(
            uhid="UHID-INVALID-02",
            name="Test Patient",
            age=30,
            gender="Male",
            phone="98765432100",
        )

    # Invalid: characters / symbols
    with pytest.raises(ValidationError):
        PatientCreate(
            uhid="UHID-INVALID-03",
            name="Test Patient",
            age=30,
            gender="Male",
            phone="+91 9876543210",
        )


def test_supplier_phone_10_digits_constraint():
    # Valid 10 digits
    s = SupplierCreate(
        name="Apollo Pharma Distributors",
        contact_person="Ramesh Gupta",
        phone="9811122334",
        email="orders@apollo.com",
        address="123 Pharma Hub, Industrial Estate",
    )
    assert s.phone == "9811122334"

    # Invalid: with hyphens or non-digits
    with pytest.raises(ValidationError):
        SupplierCreate(
            name="Apollo Pharma Distributors",
            contact_person="Ramesh Gupta",
            phone="981-112-233",
            email="orders@apollo.com",
            address="123 Pharma Hub, Industrial Estate",
        )


def test_user_phone_10_digits_constraint():
    # Valid user with 10 digits
    u = UserCreate(
        full_name="Pharmacist Test",
        email="pharm_test@hpms.hospital",
        phone="9876500001",
        password="secretpassword",
        role=UserRole.PHARMACIST,
    )
    assert u.phone == "9876500001"

    # Invalid user phone
    with pytest.raises(ValidationError):
        UserCreate(
            full_name="Pharmacist Test",
            email="pharm_test2@hpms.hospital",
            phone="12345",
            password="secretpassword",
        )


@pytest.mark.asyncio
async def test_dashboard_service_stats_with_roles(db_session, sample_data):
    user = sample_data["user"]
    kpis = await dashboard_service.get_kpis(db_session, user)

    assert kpis.role == UserRole.PHARMACIST.value
    assert kpis.user_name == "Test Pharmacist"
    assert kpis.total_active_medicines >= 1
    assert isinstance(kpis.today_billing_total, float)
    assert isinstance(kpis.stock_trends, list)
    assert isinstance(kpis.recent_bills, list)
    assert isinstance(kpis.expiring_batches_list, list)

