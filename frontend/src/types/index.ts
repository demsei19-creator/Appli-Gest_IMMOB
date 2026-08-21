// ==============================================================================
// GLOBAL API CONTRACT & PAGINATION TYPES
// ==============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | string[];
  };
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ==============================================================================
// AUTHENTICATION & USER DOMAIN
// ==============================================================================

export type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'TENANT';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  role_display: string;
  phone_number?: string;
  company_name?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==============================================================================
// PROPERTIES & UNITS DOMAIN
// ==============================================================================

export type PropertyType = 'BUILDING' | 'RESIDENCE' | 'COMMERCIAL' | 'VILLA' | 'LAND';
export type UnitType = 'STUDIO' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5_PLUS' | 'VILLA' | 'COMMERCIAL' | 'OFFICE' | 'PARKING';
export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';

export interface Property {
  id: string;
  name: string;
  code?: string;
  property_type: PropertyType;
  property_type_display: string;
  address: string;
  city: string;
  postal_code?: string;
  country: string;
  description?: string;
  notes?: string;
  purchase_price?: string;
  estimated_value?: string;
  cover_image?: string;
  units_count: number;
  occupied_units_count: number;
  vacant_units_count?: number;
  occupancy_rate?: number;
  total_monthly_revenue_potential?: string;
  actual_monthly_revenue?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  property: string;
  property_name: string;
  unit_number: string;
  floor?: string;
  unit_type: UnitType;
  unit_type_display: string;
  surface_area_sqm?: string;
  rooms_count: number;
  bathrooms_count: number;
  base_rent_amount: string;
  service_charges_amount: string;
  total_rent_amount: string;
  status: UnitStatus;
  status_display: string;
  water_meter_number?: string;
  electricity_meter_number?: string;
  description?: string;
  current_lease?: {
    id: string;
    tenant_id: string;
    tenant_name: string;
    tenant_phone: string;
    tenant_email?: string;
    start_date: string;
    end_date?: string;
    total_monthly_amount: string;
    payment_day_of_month: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TenantType = 'INDIVIDUAL' | 'COMPANY';
export type IdCardType = 'CNI' | 'PASSPORT' | 'RESIDENCE_PERMIT' | 'RCCM' | 'OTHER';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship?: string;
  phone_number: string;
  created_at: string;
}

export interface Guarantor {
  id: string;
  full_name: string;
  relationship?: string;
  phone_number: string;
  email?: string;
  id_card_number?: string;
  profession?: string;
  monthly_income?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  tenant_type: TenantType;
  tenant_type_display?: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  full_name: string;
  email?: string;
  phone_number: string;
  secondary_phone?: string;
  id_card_type?: IdCardType;
  id_card_number?: string;
  tax_id?: string;
  date_of_birth?: string;
  profession?: string;
  employer?: string;
  monthly_income?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  is_active_occupant?: boolean;
  active_lease_summary?: {
    lease_id: string;
    property_name: string;
    unit_number: string;
    start_date: string;
    monthly_amount: string;
  };
  total_unpaid_balance?: string;
  emergency_contacts?: EmergencyContact[];
  guarantors?: Guarantor[];
  active_lease?: {
    id: string;
    property_id: string;
    property_name: string;
    unit_id: string;
    unit_number: string;
    unit_type: string;
    start_date: string;
    end_date?: string;
    rent_amount: string;
    charges_amount: string;
    total_monthly_amount: string;
    deposit_amount: string;
    payment_day_of_month: number;
    status: string;
  };
  lease_history?: Array<{
    id: string;
    property_name: string;
    unit_number: string;
    start_date: string;
    end_date?: string;
    status: string;
    status_display: string;
    total_monthly_amount: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// LEASES & DEPOSITS DOMAIN
// ==============================================================================

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'CANCELLED';
export type DepositStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'RETAINED';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export interface Deposit {
  id: string;
  lease: string;
  amount: string;
  received_date?: string;
  status: DepositStatus;
  status_display: string;
  refunded_amount: string;
  refunded_date?: string;
  deduction_amount: string;
  deduction_reason?: string;
  payment_method?: string;
  receipt_reference?: string;
  created_at: string;
}

export interface Lease {
  id: string;
  lease_number: string;
  unit: string;
  unit_number?: string;
  unit_label?: string;
  property_id?: string;
  property_name: string;
  property_city?: string;
  tenant: string;
  tenant_name: string;
  tenant_phone?: string;
  start_date: string;
  end_date?: string;
  rent_amount: string;
  charges_amount: string;
  total_monthly_amount: string;
  deposit_amount: string;
  payment_day_of_month: number;
  payment_frequency: PaymentFrequency;
  payment_frequency_display: string;
  status: LeaseStatus;
  status_display: string;
  terms_and_conditions?: string;
  termination_date?: string;
  termination_reason?: string;
  deposit?: Deposit;
  unit_detail?: Unit;
  tenant_detail?: Tenant;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// BILLING & INVOICES DOMAIN
// ==============================================================================

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface RentInvoice {
  id: string;
  lease: string;
  lease_number?: string;
  tenant_id?: string;
  tenant_name: string;
  tenant_phone?: string;
  unit_id?: string;
  unit_number?: string;
  unit_label?: string;
  property_id?: string;
  property_name: string;
  property_city?: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  rent_amount: string;
  charges_amount: string;
  total_expected: string;
  total_paid: string;
  remaining_balance: string;
  status: InvoiceStatus;
  status_display: string;
  notes?: string;
  lease_detail?: Lease;
  payments_allocations?: Array<{
    id: string;
    payment_id: string;
    payment_number: string;
    payment_date: string;
    payment_method: string;
    allocated_amount: string;
    created_at: string;
  }>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ==============================================================================
// PAYMENTS & ALLOCATIONS DOMAIN
// ==============================================================================

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CARD' | 'DIRECT_DEBIT' | 'OTHER';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

export interface PaymentAllocation {
  id: string;
  invoice?: string;
  invoice_id?: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  property_name?: string;
  unit_number?: string;
  allocated_amount: string;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant: string;
  tenant_name: string;
  tenant_phone?: string;
  payment_number: string;
  receipt_number?: string;
  amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  reference_number?: string;
  status: PaymentStatus;
  status_display: string;
  allocations_count?: number;
  total_allocated?: string;
  unallocated?: string;
  notes?: string;
  allocations?: PaymentAllocation[];
  tenant_detail?: Tenant;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ==============================================================================
// MAINTENANCE & SUPPLIERS DOMAIN
// ==============================================================================

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MaintenanceStatus = 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SupplierCategory = 'PLUMBING' | 'ELECTRICAL' | 'MASONRY' | 'PAINTING' | 'CLEANING' | 'HVAC' | 'SECURITY' | 'OTHER';

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  category_display: string;
  contact_name?: string;
  phone_number: string;
  email?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  total_interventions_count?: number;
  total_spent?: string;
  interventions?: MaintenanceRequest[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MaintenanceRequest {
  id: string;
  ticket_number?: string;
  property: string;
  property_id?: string;
  property_name: string;
  property_city?: string;
  unit?: string;
  unit_id?: string;
  unit_number?: string;
  unit_label?: string;
  reported_by_tenant?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_phone?: string;
  supplier?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_category?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  priority_display: string;
  status: MaintenanceStatus;
  status_display: string;
  estimated_cost?: string;
  actual_cost?: string;
  reported_date: string;
  completed_date?: string;
  property_detail?: Property;
  unit_detail?: Unit;
  tenant_detail?: Tenant;
  supplier_detail?: Supplier;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ==============================================================================
// EXPENSES & TAXES DOMAIN
// ==============================================================================

export type ExpenseCategory = 'REPAIRS' | 'MAINTENANCE' | 'INSURANCE' | 'UTILITIES' | 'MANAGEMENT' | 'SECURITY' | 'MORTGAGE' | 'OTHER';

export interface Expense {
  id: string;
  expense_number?: string;
  property: string;
  property_id?: string;
  property_name: string;
  property_city?: string;
  unit?: string;
  unit_id?: string;
  unit_number?: string;
  unit_label?: string;
  supplier?: string;
  supplier_id?: string;
  supplier_name?: string;
  category: ExpenseCategory;
  category_display: string;
  title: string;
  amount: string;
  expense_date: string;
  paid_to?: string;
  receipt_file?: string;
  is_deductible: boolean;
  notes?: string;
  property_detail?: Property;
  unit_detail?: Unit;
  supplier_detail?: Supplier;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type TaxType = 'PROPERTY_TAX' | 'HOUSING_TAX' | 'INCOME_TAX' | 'LOCAL_DEV' | 'OTHER';

export interface PropertyTax {
  id: string;
  tax_number?: string;
  property: string;
  property_id?: string;
  property_name: string;
  property_city?: string;
  tax_type: TaxType;
  tax_type_display: string;
  fiscal_year: number;
  amount: string;
  due_date: string;
  paid_date?: string;
  is_paid: boolean;
  reference_notice?: string;
  notice_file?: string;
  notes?: string;
  property_detail?: Property;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TaxSimulationData {
  fiscal_year: number;
  gross_rental_income: string;
  total_deductible_expenses: string;
  repairs_maintenance_deductible: string;
  insurance_deductible: string;
  mortgage_interest_deductible: string;
  management_fees_deductible: string;
  utilities_security_deductible: string;
  other_deductible: string;
  net_taxable_income: string;
  estimated_tax_rate: string;
  estimated_tax_amount: string;
  net_cashflow_after_tax: string;
}

// ==============================================================================
// DOCUMENTS DOMAIN
// ==============================================================================

export type DocumentType = 'LEASE_CONTRACT' | 'ID_CARD' | 'RENT_RECEIPT' | 'INVOICE' | 'TAX_NOTICE' | 'INSURANCE' | 'PROPERTY_DEED' | 'PHOTO' | 'OTHER';

export interface DocumentItem {
  id: string;
  doc_number?: string;
  title: string;
  document_type: DocumentType;
  document_type_display: string;
  file: string;
  file_url?: string;
  file_size_bytes?: number;
  formatted_file_size?: string;
  mime_type?: string;
  property?: string;
  property_name?: string;
  unit?: string;
  unit_number?: string;
  tenant?: string;
  tenant_name?: string;
  lease?: string;
  lease_contract_number?: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

// ==============================================================================
// DASHBOARD & KPIS
// ==============================================================================

export interface DashboardKPIs {
  portfolio: {
    total_properties: number;
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    occupancy_rate_percent: number;
  };
  finances: {
    total_expected_rent: string;
    total_collected_rent: string;
    total_unpaid_rent: string;
    collection_rate_percent: number;
    total_expenses: string;
    net_operating_income: string;
  };
  operations: {
    active_maintenance_count: number;
    urgent_maintenance_count: number;
  };
  monthly_timeline: Array<{
    month_key: string;
    month_label: string;
    collected_rent: string;
    expenses: string;
    net_cashflow: string;
  }>;
  alerts: {
    expiring_leases: Array<{
      id: string;
      lease_number: string;
      tenant_name: string;
      property_name: string;
      unit_number: string;
      end_date: string;
      days_remaining: number;
    }>;
    overdue_invoices: Array<{
      id: string;
      invoice_number: string;
      tenant_name: string;
      property_name: string;
      unit_number: string;
      due_date: string;
      remaining_balance: string;
    }>;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    title: string;
    amount?: string;
    date: string;
    status: string;
  }>;
}

export interface FinancialReportData {
  report_year: number;
  generated_at: string;
  owner_name: string;
  company_name: string;
  owner_email: string;
  summary: {
    expected_rent: string;
    collected_rent: string;
    unpaid_rent: string;
    collection_rate_percent: number;
    total_expenses: string;
    total_taxes_paid: string;
    net_operating_result: string;
  };
  expenses_breakdown: Array<{
    category: string;
    amount: string;
  }>;
  properties_breakdown: Array<{
    property_id: string;
    property_name: string;
    property_city: string;
    total_units: number;
    occupied_units: number;
    occupancy_rate_percent: number;
    expected_rent: string;
    collected_rent: string;
    unpaid_rent: string;
    expenses: string;
    net_operating_result: string;
  }>;
}

// ==============================================================================
// AUDIT DOMAIN
// ==============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'PAYMENT_ALLOCATION' | 'LOGIN' | 'LOGOUT';

export interface AuditLog {
  id: string;
  user?: string;
  user_email?: string;
  action: AuditAction;
  action_display: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

