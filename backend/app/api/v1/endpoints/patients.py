import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.patient import Patient, PatientType
from app.schemas.patient import PatientCreate, PatientUpdate, PatientOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[PatientOut])
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    patient_type: Optional[PatientType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Patient).options(selectinload(Patient.bills))
    count_stmt = select(func.count(Patient.id))

    filters = []
    if patient_type:
        filters.append(Patient.patient_type == patient_type)
    if search:
        search_filter = or_(
            Patient.uhid.ilike(f"%{search}%"),
            Patient.name.ilike(f"%{search}%"),
            Patient.phone.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Patient.id.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(stmt)
    patients = res.scalars().all()

    items = [
        PatientOut(
            id=p.id,
            uhid=p.uhid,
            name=p.name,
            age=p.age,
            gender=p.gender,
            phone=p.phone,
            address=p.address,
            patient_type=p.patient_type,
            created_at=p.created_at,
            bills_count=len(p.bills),
        )
        for p in patients
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    stmt = select(Patient).where(Patient.id == patient_id).options(selectinload(Patient.bills))
    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    return PatientOut(
        id=p.id,
        uhid=p.uhid,
        name=p.name,
        age=p.age,
        gender=p.gender,
        phone=p.phone,
        address=p.address,
        patient_type=p.patient_type,
        created_at=p.created_at,
        bills_count=len(p.bills),
    )


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_in: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.BILLING_STAFF])),
) -> Any:
    # Check UHID unique
    stmt = select(Patient).where(Patient.uhid == patient_in.uhid)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Patient with this UHID already exists")

    patient = Patient(**patient_in.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    return PatientOut(
        id=patient.id,
        uhid=patient.uhid,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        address=patient.address,
        patient_type=patient.patient_type,
        created_at=patient.created_at,
        bills_count=0,
    )


@router.put("/{patient_id}", response_model=PatientOut)
async def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.PHARMACIST, UserRole.BILLING_STAFF])),
) -> Any:
    stmt = select(Patient).where(Patient.id == patient_id).options(selectinload(Patient.bills))
    res = await db.execute(stmt)
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(patient, field, val)

    await db.commit()
    await db.refresh(patient)

    return PatientOut(
        id=patient.id,
        uhid=patient.uhid,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        address=patient.address,
        patient_type=patient.patient_type,
        created_at=patient.created_at,
        bills_count=len(patient.bills),
    )
