# Hospital Pharmacy Management System (HPMS)

A production-grade, full-stack Hospital Pharmacy Management System built with **React 18 + Vite + TypeScript**, **FastAPI + SQLAlchemy 2.0 (async)**, and **PostgreSQL 16**.

HPMS enforces strict clinical pharmacy operations including **First-Expire-First-Out (FEFO) dispensing**, low-stock/shelf-life thresholds, automated purchase order goods receipt with batch creation, department requisitions, point-of-sale patient billing, and comprehensive audit ledgers.

> 📖 **Comprehensive ERP Project Documentation**: Full 10-chapter academic and technical report available at [`DOCUMENTATION.md`](file:///Users/zayn/Documents/Work/ERP-Pharmacy/DOCUMENTATION.md) (includes DFDs Level 0/1/2, full ERD, Data Dictionary, Test Execution Matrix, and Architecture).

---

## 1. System Architecture (3-Layer)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER (SPA)                              │
│         React 18 • Vite • TypeScript • Tailwind CSS • TanStack Query        │
│         Minimal/Flat Design System • Recharts Flat Visualizations           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / JSON (Axios + JWT Bearer)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       APPLICATION LAYER (API)                               │
│                FastAPI (Python 3.12) • Pydantic v2 Validation               │
│                                                                             │
│  api/v1/endpoints/  ──►  services/               ──►  crud/ & models/       │
│  (HTTP / Routing)        ├─ inventory_service.py      (SQLAlchemy 2.0 Async)│
│                          │  (FEFO Stock Deduct)                             │
│                          ├─ billing_service.py                              │
│                          │  (POS & Refund Restore)                          │
│                          ├─ purchase_service.py                             │
│                          │  (PO & Batch Goods Receipt)                      │
│                          ├─ department_issue_service.py                     │
│                          └─ report_service.py                               │
│                             (Ledger & CSV Exports)                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ asyncpg / AsyncSession
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                          DATA LAYER (RDBMS)                                 │
│                 PostgreSQL 16-Alpine • Alembic Migrations                    │
│   medicines • batches • suppliers • purchase_orders • patients • bills ...   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Modules & Domain Workflow

1. **Medicine Inventory & FEFO**:
   - Master drug formulary with therapeutic categories, dosage units, pack sizes, and reorder levels.
   - Batch-level tracking (`quantity_available`, `mrp`, `unit_cost_price`, `manufacture_date`, `expiry_date`).
   - Shared `InventoryService.deduct_stock_fefo` strictly prioritizes batches with earliest expiration. Expired batches are automatically quarantined.
   - Stock adjustments for damages, expirations, loss, or count reconciliation with mandatory reason audit trails.

2. **Supplier & Purchase Management**:
   - Supplier registry with contact details and GST numbers.
   - Purchase order generation (`DRAFT` → `ORDERED` → `PARTIALLY_RECEIVED` → `RECEIVED` → `CANCELLED`).
   - "Receive Goods" flow automatically creates new inventory batches and updates PO line quantities.

3. **Patient Billing & Dispensing**:
   - POS checkout for OPD/IPD patients.
   - Medicine search auto-allocates earliest expiry batch via FEFO and decrements stock atomically.
   - Discounts, taxes, and net totals computation.
   - Printable A4 hospital tax invoice view.
   - Void/Refund feature that atomically returns dispensed quantities back into their originating batches.

4. **Hospital Department Issues**:
   - Requisition workflow from hospital wards/ICUs (`PENDING` → `ISSUED` / `REJECTED`).
   - Pharmacist approval automatically deducts stock via FEFO.
   - Department consumption history and reporting.

5. **Operations Dashboard & Reports**:
   - Real-time KPIs: Active medicines, total inventory value, low-stock count, expiring-soon count (≤30d), expired batches, today's sales, pending POs.
   - Flat single-color charts: Top 5 consuming departments and 7-day stock velocity.
   - 6 exportable reports: Current Stock, Expiry Alerts, Sales, Procurement, Department Consumption, and unified Stock Movement Ledger.

---

## 3. Strict Minimal Flat Design System

- **No shadows**: Elevation is conveyed through clean 1px borders (`#E2E8F0`).
- **No gradients**: Solid, accessible flat colors.
- **Teal Accent (`#0D9488`)**: Used for primary actions, active navigation states, and focus states.
- **Color Tokens**:
  - Background: `#FFFFFF`
  - Surface: `#F8FAFC`
  - Surface Alt / Headers: `#F1F5F9`
  - Border: `#E2E8F0`
  - Text Primary: `#0F172A`
  - Text Secondary: `#64748B`
  - Accent / Teal: `#0D9488` (Hover: `#0F766E`, Soft: `#CCFBF1`)
  - Warning: `#B45309` (Soft: `#FEF3C7`)
  - Danger: `#B91C1C` (Soft: `#FEE2E2`)
  - Success: `#15803D` (Soft: `#DCFCE7`)

---

## 4. Default Login Credentials (Pre-Seeded)

The database automatically seeds standard users and mock hospital data upon initial startup:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin@hpms.hospital` | `admin123` | Full administrative control & user management |
| **PHARMACIST** | `pharmacist@hpms.hospital` | `pharm123` | Stock, FEFO batches, PO receipt, approvals |
| **BILLING_STAFF** | `billing@hpms.hospital` | `bill123` | Patient registration, POS billing & invoices |
| **DEPT_STAFF** | `dept@hpms.hospital` | `dept123` | Ward requisitions and consumption tracking |

*Quick-login presets are also provided directly on the Login screen for testing.*

---

## 5. Quickstart with Docker Compose

### Prerequisites
- Docker engine 24+ and Docker Compose v2+ installed.

### Single Command Launch
```bash
docker compose up --build
```

This single command will:
1. Launch **PostgreSQL 16-alpine** and wait for its healthcheck.
2. Build and start the **FastAPI backend** on port `8000`.
3. Automatically run **Alembic migrations** and database **seeds** on startup via `entrypoint.sh`.
4. Build the **React SPA** and serve it via Nginx on port `5173`.

### Access URLs
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 6. Local Development Setup (Without Docker)

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations and seed
alembic upgrade head
python -m app.seeds.seed_data

# Start server with live reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Backend Tests
```bash
cd backend
pytest -v
```

---

## 7. Assumptions & Engineering Decisions

1. **FEFO Prioritization**:
   - If multiple batches exist for a single medicine, the system sorts by `expiry_date ASC, id ASC`.
   - Batches with `expiry_date <= today` are considered expired and rejected from automatic dispensing.
   - An explicit batch override can be chosen if nursing staff specifically scans a physical batch barcode.
2. **Atomic Restorations on Void / Refund**:
   - When a bill is voided or refunded, the exact quantities dispensed are returned to their originating batches (`Batch.quantity_available += qty`).
3. **Goods Receipt Batch Creation**:
   - A purchase order can be received in full or in partial installments. Each delivery generates unique batch inventory records tagged with supplier ID, PO item ID, cost price, and MRP.
4. **Single Stock Ledger**:
   - All stock additions (manual or PO receipt), patient sales, department issues, damages, and write-offs flow into a unified `StockMovementLedger` table view for audit and compliance.