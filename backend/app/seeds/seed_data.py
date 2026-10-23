import asyncio
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.supplier import Supplier
from app.models.medicine import Medicine
from app.models.batch import Batch
from app.models.department import Department
from app.models.patient import Patient, PatientType
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.bill import Bill, BillItem, PaymentMode, PaymentStatus
from app.models.department_issue import DepartmentIssue, IssueItem, IssueStatus


async def run_seeds():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Admin User check
        stmt = select(User).where(User.email == "admin@hpms.hospital")
        res = await db.execute(stmt)
        admin_user = res.scalar_one_or_none()

        if not admin_user:
            print("🌱 Seeding initial users...")
            admin_user = User(
                full_name="Hospital Administrator",
                email="admin@hpms.hospital",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True,
            )
            pharmacist_user = User(
                full_name="Chief Pharmacist Sharma",
                email="pharmacist@hpms.hospital",
                hashed_password=get_password_hash("pharm123"),
                role=UserRole.PHARMACIST,
                is_active=True,
            )
            billing_user = User(
                full_name="Billing Clerk Rajesh",
                email="billing@hpms.hospital",
                hashed_password=get_password_hash("bill123"),
                role=UserRole.BILLING_STAFF,
                is_active=True,
            )
            dept_user = User(
                full_name="Nurse Incharge Priya",
                email="dept@hpms.hospital",
                hashed_password=get_password_hash("dept123"),
                role=UserRole.DEPT_STAFF,
                is_active=True,
            )
            db.add_all([admin_user, pharmacist_user, billing_user, dept_user])
            await db.flush()

        # 2. Check Suppliers
        sup_stmt = select(Supplier)
        sup_res = await db.execute(sup_stmt)
        if not sup_res.first():
            print("🌱 Seeding suppliers...")
            s1 = Supplier(
                name="Apex Healthcare Distributors",
                contact_person="Ramesh Gupta",
                phone="+91 98765 43210",
                email="orders@apexdistributors.com",
                address="Plot 44, Industrial Area Phase II, New Delhi",
                gst_number="07AAAAA0000A1Z5",
                is_active=True,
            )
            s2 = Supplier(
                name="BioMed Pharma Logistics",
                contact_person="Sunil Verma",
                phone="+91 98111 22334",
                email="contact@biomedlogistics.in",
                address="201 Horizon Chambers, Andheri East, Mumbai",
                gst_number="27BBBBB1111B1Z2",
                is_active=True,
            )
            s3 = Supplier(
                name="CareLife Pharmaceuticals",
                contact_person="Dr. Anjali Mehta",
                phone="+91 94000 55667",
                email="supply@carelifepharma.com",
                address="12 Electronics City, Bengaluru",
                gst_number="29CCCCC2222C1Z8",
                is_active=True,
            )
            db.add_all([s1, s2, s3])
            await db.flush()

        # 3. Check Departments
        dept_stmt = select(Department)
        dept_res = await db.execute(dept_stmt)
        if not dept_res.first():
            print("🌱 Seeding hospital departments...")
            d1 = Department(name="Intensive Care Unit (ICU)", location="Block A, 2nd Floor", department_head="Dr. K. N. Rao", is_active=True)
            d2 = Department(name="Emergency & Trauma", location="Ground Floor, East Wing", department_head="Dr. Sunita Kapoor", is_active=True)
            d3 = Department(name="Operation Theatre (OT)", location="Block B, 3rd Floor", department_head="Dr. Alok Nath", is_active=True)
            d4 = Department(name="General Medicine Ward", location="Block C, 1st Floor", department_head="Dr. Ramanathan", is_active=True)
            d5 = Department(name="Pediatrics Ward", location="Block A, 4th Floor", department_head="Dr. Meera Iyer", is_active=True)
            db.add_all([d1, d2, d3, d4, d5])
            await db.flush()

        # 4. Check Medicines
        med_stmt = select(Medicine)
        med_res = await db.execute(med_stmt)
        if not med_res.first():
            print("🌱 Seeding medicine catalog and inventory batches...")
            today = date.today()

            meds = [
                Medicine(
                    name="Amoxicillin 500mg",
                    generic_name="Amoxicillin Trihydrate",
                    category="Antibiotics",
                    manufacturer="Cipla Ltd",
                    unit="Capsule",
                    pack_size=10,
                    reorder_level=50,
                    hsn_code="300410",
                    is_active=True,
                ),
                Medicine(
                    name="Paracetamol 650mg",
                    generic_name="Acetaminophen",
                    category="Analgesics & Antipyretics",
                    manufacturer="Micro Labs",
                    unit="Tablet",
                    pack_size=15,
                    reorder_level=100,
                    hsn_code="300490",
                    is_active=True,
                ),
                Medicine(
                    name="Pantoprazole 40mg",
                    generic_name="Pantoprazole Sodium",
                    category="Gastrointestinal",
                    manufacturer="Alkem Laboratories",
                    unit="Tablet",
                    pack_size=10,
                    reorder_level=40,
                    hsn_code="300490",
                    is_active=True,
                ),
                Medicine(
                    name="Metformin 500mg ER",
                    generic_name="Metformin Hydrochloride",
                    category="Antidiabetic",
                    manufacturer="USV Pvt Ltd",
                    unit="Tablet",
                    pack_size=20,
                    reorder_level=60,
                    hsn_code="300490",
                    is_active=True,
                ),
                Medicine(
                    name="Amlodipine 5mg",
                    generic_name="Amlodipine Besylate",
                    category="Cardiovascular",
                    manufacturer="Torrent Pharma",
                    unit="Tablet",
                    pack_size=10,
                    reorder_level=30,
                    hsn_code="300490",
                    is_active=True,
                ),
                Medicine(
                    name="Ceftriaxone 1g Injection",
                    generic_name="Ceftriaxone Sodium",
                    category="Antibiotics",
                    manufacturer="Aristo Pharmaceuticals",
                    unit="Vial",
                    pack_size=1,
                    reorder_level=20,
                    hsn_code="300420",
                    is_active=True,
                ),
                Medicine(
                    name="Salbutamol Nebulizer Solution",
                    generic_name="Salbutamol Sulphate",
                    category="Respiratory",
                    manufacturer="GlaxoSmithKline",
                    unit="Respules",
                    pack_size=5,
                    reorder_level=15,
                    hsn_code="300490",
                    is_active=True,
                ),
                Medicine(
                    name="Insulin Regular 100IU/ml",
                    generic_name="Human Insulin",
                    category="Antidiabetic",
                    manufacturer="Novo Nordisk",
                    unit="Vial",
                    pack_size=1,
                    reorder_level=10,
                    hsn_code="300431",
                    is_active=True,
                ),
            ]
            db.add_all(meds)
            await db.flush()

            # Create batches with various expiry dates to demonstrate FEFO and alerts
            batches = [
                # Amoxicillin - 2 batches (one expiring in 20 days to demonstrate alert, one fresh)
                Batch(
                    medicine_id=meds[0].id,
                    batch_number="AMX-2026-A1",
                    supplier_id=1,
                    quantity_received=150,
                    quantity_available=15,  # Low stock on this batch!
                    unit_cost_price=4.50,
                    mrp=8.00,
                    manufacture_date=today - timedelta(days=340),
                    expiry_date=today + timedelta(days=22),  # EXPIRING SOON!
                    received_date=today - timedelta(days=300),
                ),
                Batch(
                    medicine_id=meds[0].id,
                    batch_number="AMX-2026-B2",
                    supplier_id=1,
                    quantity_received=300,
                    quantity_available=280,
                    unit_cost_price=4.60,
                    mrp=8.50,
                    manufacture_date=today - timedelta(days=60),
                    expiry_date=today + timedelta(days=500),
                    received_date=today - timedelta(days=45),
                ),
                # Paracetamol
                Batch(
                    medicine_id=meds[1].id,
                    batch_number="PCM-650-X1",
                    supplier_id=2,
                    quantity_received=500,
                    quantity_available=420,
                    unit_cost_price=1.20,
                    mrp=2.50,
                    manufacture_date=today - timedelta(days=90),
                    expiry_date=today + timedelta(days=640),
                    received_date=today - timedelta(days=80),
                ),
                # Pantoprazole
                Batch(
                    medicine_id=meds[2].id,
                    batch_number="PAN-40-09",
                    supplier_id=2,
                    quantity_received=200,
                    quantity_available=160,
                    unit_cost_price=5.00,
                    mrp=9.50,
                    manufacture_date=today - timedelta(days=120),
                    expiry_date=today + timedelta(days=400),
                    received_date=today - timedelta(days=110),
                ),
                # Metformin
                Batch(
                    medicine_id=meds[3].id,
                    batch_number="MET-500-Z",
                    supplier_id=3,
                    quantity_received=250,
                    quantity_available=180,
                    unit_cost_price=2.00,
                    mrp=4.00,
                    manufacture_date=today - timedelta(days=70),
                    expiry_date=today + timedelta(days=450),
                    received_date=today - timedelta(days=60),
                ),
                # Ceftriaxone
                Batch(
                    medicine_id=meds[5].id,
                    batch_number="CEF-1G-99",
                    supplier_id=1,
                    quantity_received=80,
                    quantity_available=12,  # Low stock alert!
                    unit_cost_price=35.00,
                    mrp=65.00,
                    manufacture_date=today - timedelta(days=180),
                    expiry_date=today + timedelta(days=180),
                    received_date=today - timedelta(days=150),
                ),
            ]
            db.add_all(batches)
            await db.flush()

        # 5. Check Patients
        pat_stmt = select(Patient)
        pat_res = await db.execute(pat_stmt)
        if not pat_res.first():
            print("🌱 Seeding sample patients...")
            p1 = Patient(
                uhid="UHID-2026-0001",
                name="Harish Chandra",
                age=54,
                gender="Male",
                phone="+91 98220 11223",
                address="Flat 402, Green Park Apartments, Sector 15",
                patient_type=PatientType.OPD,
            )
            p2 = Patient(
                uhid="UHID-2026-0002",
                name="Saraswati Devi",
                age=68,
                gender="Female",
                phone="+91 97110 33445",
                address="House 88, Civil Lines",
                patient_type=PatientType.IPD,
            )
            p3 = Patient(
                uhid="UHID-2026-0003",
                name="Aakash Nair",
                age=31,
                gender="Male",
                phone="+91 95440 66778",
                address="Koramangala 4th Block, Bengaluru",
                patient_type=PatientType.OPD,
            )
            db.add_all([p1, p2, p3])
            await db.flush()

        await db.commit()
        print("✅ Database seeding complete.")


if __name__ == "__main__":
    asyncio.run(run_seeds())
