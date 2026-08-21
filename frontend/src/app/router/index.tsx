import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { PropertiesPage } from '@/features/properties/pages/PropertiesPage';
import { PropertyDetailPage } from '@/features/properties/pages/PropertyDetailPage';
import { UnitsPage } from '@/features/units/pages/UnitsPage';
import { UnitDetailPage } from '@/features/units/pages/UnitDetailPage';
import { TenantsPage } from '@/features/tenants/pages/TenantsPage';
import { TenantDetailPage } from '@/features/tenants/pages/TenantDetailPage';
import { LeasesPage } from '@/features/leases/pages/LeasesPage';
import { LeaseDetailPage } from '@/features/leases/pages/LeaseDetailPage';
import { BillingPage } from '@/features/billing/pages/BillingPage';
import { InvoiceDetailPage } from '@/features/billing/pages/InvoiceDetailPage';
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage';
import { PaymentReceiptPage } from '@/features/payments/pages/PaymentReceiptPage';
import { MaintenancePage } from '@/features/maintenance/pages/MaintenancePage';
import { MaintenanceDetailPage } from '@/features/maintenance/pages/MaintenanceDetailPage';
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage';
import { ExpensesPage } from '@/features/expenses/pages/ExpensesPage';
import { TaxesPage } from '@/features/taxes/pages/TaxesPage';
import { DocumentsPage } from '@/features/documents/pages/DocumentsPage';
import { FinancialReportPage } from '@/features/reports/pages/FinancialReportPage';
import { AdminAuditPage } from '@/features/administration/pages/AdminAuditPage';
import { TeamManagementPage } from '@/features/administration/pages/TeamManagementPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'properties/:id', element: <PropertyDetailPage /> },
      { path: 'units', element: <UnitsPage /> },
      { path: 'units/:id', element: <UnitDetailPage /> },
      { path: 'tenants', element: <TenantsPage /> },
      { path: 'tenants/:id', element: <TenantDetailPage /> },
      { path: 'leases', element: <LeasesPage /> },
      { path: 'leases/:id', element: <LeaseDetailPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'billing/:id', element: <InvoiceDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'payments/:id/receipt', element: <PaymentReceiptPage /> },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'maintenance/:id', element: <MaintenanceDetailPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'taxes', element: <TaxesPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'reports', element: <FinancialReportPage /> },
      {
        path: 'admin/team',
        element: (
          <ProtectedRoute allowedRoles={['OWNER']}>
            <TeamManagementPage />
          </ProtectedRoute>
        ),
      },
      { path: 'admin/audit', element: <AdminAuditPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
