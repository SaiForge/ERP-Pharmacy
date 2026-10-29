export type UserRole = 'ADMIN' | 'PHARMACIST' | 'BILLING_STAFF' | 'DEPT_STAFF';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Medicine {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  manufacturer: string;
  unit: string;
  pack_size: number;
  reorder_level: number;
  hsn_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_stock?: number;
  available_batches_count?: number;
  is_low_stock?: boolean;
  has_expiring_soon?: boolean;
  has_expired?: boolean;
  earliest_expiry?: string | null;
}

export interface Batch {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  batch_number: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  purchase_order_item_id?: number | null;
  quantity_received: number;
  quantity_available: number;
  unit_cost_price: number;
  mrp: number;
  manufacture_date: string;
  expiry_date: string;
  received_date: string;
  created_at: string;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  days_to_expiry?: number;
}

export type AdjustmentType = 'DAMAGE' | 'LOSS' | 'EXPIRED' | 'CORRECTION';

export interface StockAdjustment {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  batch_id: number;
  batch_number?: string;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason: string;
  adjusted_by: number;
  adjusted_by_name?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number?: string | null;
  is_active: boolean;
  created_at: string;
  total_orders_count?: number;
  total_spend?: number;
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  line_total?: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  expected_date?: string | null;
  status: POStatus;
  total_amount: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export type PatientType = 'OPD' | 'IPD';

export interface Patient {
  id: number;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address?: string | null;
  patient_type: PatientType;
  created_at: string;
  bills_count?: number;
}

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'INSURANCE';
export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';

export interface BillItem {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  batch_id: number;
  batch_number?: string;
  expiry_date?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Bill {
  id: number;
  bill_number: string;
  patient_id: number;
  patient_name?: string;
  patient_uhid?: string;
  patient_phone?: string;
  bill_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  net_amount: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  items: BillItem[];
}

export interface Department {
  id: number;
  name: string;
  location: string;
  department_head: string;
  is_active: boolean;
  created_at: string;
  active_issues_count?: number;
}

export type IssueStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED';

export interface IssueItem {
  id: number;
  medicine_id: number;
  medicine_name?: string;
  batch_id?: number | null;
  batch_number?: string | null;
  quantity_requested: number;
  quantity_issued: number;
}

export interface DepartmentIssue {
  id: number;
  issue_number: string;
  department_id: number;
  department_name?: string;
  issue_date: string;
  requested_by: string;
  approved_by?: number | null;
  approved_by_name?: string | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  items: IssueItem[];
}

export interface DeptConsumptionData {
  department_name: string;
  units_consumed: number;
  total_value: number;
}

export interface StockTrendPoint {
  date: string;
  stock_in: number;
  stock_out: number;
}

export interface BillSummaryItem {
  id: number;
  bill_number: string;
  patient_name: string;
  patient_phone?: string | null;
  bill_date: string;
  net_amount: number;
  payment_mode: string;
  payment_status: string;
}

export interface ExpiringBatchSummary {
  id: number;
  batch_number: string;
  medicine_name: string;
  expiry_date: string;
  days_to_expiry: number;
  quantity_available: number;
  mrp: number;
}

export interface LowStockMedicineSummary {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  current_stock: number;
  reorder_level: number;
}

export interface DeptRequisitionSummary {
  id: number;
  issue_number: string;
  department_name: string;
  requested_by: string;
  status: string;
  items_count: number;
  issue_date: string;
}

export interface DashboardKPIs {
  role?: string;
  user_name?: string;
  total_active_medicines: number;
  total_stock_value: number;
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  today_billing_total: number;
  today_bills_count: number;
  today_cash_total?: number;
  today_upi_total?: number;
  today_card_total?: number;
  today_insurance_total?: number;
  pending_purchase_orders: number;
  pending_department_issues?: number;
  approved_department_issues?: number;
  issued_department_issues?: number;
  top_departments_consumption: DeptConsumptionData[];
  stock_trends: StockTrendPoint[];
  recent_bills?: BillSummaryItem[];
  expiring_batches_list?: ExpiringBatchSummary[];
  low_stock_medicines?: LowStockMedicineSummary[];
  recent_requisitions?: DeptRequisitionSummary[];
}

export interface StockReportItem {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  unit: string;
  pack_size: number;
  reorder_level: number;
  batch_number: string;
  quantity_available: number;
  unit_cost_price: number;
  mrp: number;
  total_cost_value: number;
  total_mrp_value: number;
  expiry_date: string;
  days_to_expiry: number;
  status: string;
}

export interface ExpiryReportItem {
  medicine_id: number;
  medicine_name: string;
  category: string;
  batch_number: string;
  quantity_available: number;
  unit_cost_price: number;
  mrp: number;
  expiry_date: string;
  days_to_expiry: number;
  status: string;
}

export interface SalesReportItem {
  bill_id: number;
  bill_number: string;
  bill_date: string;
  patient_name: string;
  patient_uhid: string;
  patient_type: string;
  payment_mode: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  tax: number;
  net_amount: number;
  items_count: number;
}

export interface PurchaseReportItem {
  po_id: number;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_date?: string | null;
  status: string;
  total_amount: number;
  items_count: number;
  received_items_count: number;
}

export interface ConsumptionReportItem {
  department_id: number;
  department_name: string;
  medicine_name: string;
  category: string;
  total_quantity_issued: number;
  issues_count: number;
  last_issued_date?: string | null;
}

export interface StockMovementLedgerItem {
  id: string;
  timestamp: string;
  movement_type: string;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  quantity_in: number;
  quantity_out: number;
  reference_id: string;
  notes?: string | null;
  performed_by?: string | null;
}
