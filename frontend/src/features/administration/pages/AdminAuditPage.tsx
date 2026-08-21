import React, { useState } from 'react';
import { ShieldAlert, Search, UserCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, Column } from '@/components/ui/Table';
import { AuditLog } from '@/types';

export const AdminAuditPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const sampleAuditLogs: AuditLog[] = [
    {
      id: '1',
      user: '1',
      user_email: 'admin@immogestion.pro',
      action: 'PAYMENT_ALLOCATION',
      action_display: 'Allocation de paiement',
      resource_type: 'Payment',
      resource_id: 'PAY-202608-F84A',
      changes: { amount: '380000.00', invoice_id: 'FAC-202608-A19B' },
      ip_address: '192.168.1.45',
      created_at: '21/08/2026 10:30',
    },
    {
      id: '2',
      user: '1',
      user_email: 'admin@immogestion.pro',
      action: 'CREATE',
      action_display: 'Création',
      resource_type: 'Lease',
      resource_id: 'BAIL-2026-004',
      changes: { tenant: 'Amadou Diallo', rent: '350000.00' },
      ip_address: '192.168.1.45',
      created_at: '20/08/2026 15:12',
    },
  ];

  const columns: Column<AuditLog>[] = [
    {
      header: 'Utilisateur & IP',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.user_email || 'Système'}</span>
          <span className="text-[11px] text-slate-500 font-mono">IP: {row.ip_address || '127.0.0.1'}</span>
        </div>
      ),
    },
    {
      header: 'Action Réalisée',
      cell: (row) => (
        <Badge variant={row.action === 'CREATE' ? 'emerald' : row.action === 'PAYMENT_ALLOCATION' ? 'blue' : 'amber'}>
          {row.action_display}
        </Badge>
      ),
    },
    {
      header: 'Ressource Concernée',
      cell: (row) => (
        <span className="text-xs text-slate-800 font-medium">
          {row.resource_type} #{row.resource_id}
        </span>
      ),
    },
    {
      header: 'Détails des données',
      cell: (row) => (
        <span className="text-xs text-slate-600 font-mono block max-w-xs truncate">
          {JSON.stringify(row.changes)}
        </span>
      ),
    },
    {
      header: 'Horodatage',
      accessorKey: 'created_at',
      className: 'text-xs text-slate-500',
    },
  ];

  return (
    <PageContainer
      title="Journal d'Audit & Sécurité"
      description="Traçabilité immuable de l'ensemble des opérations critiques et transactions financières (Règle 30)."
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-72">
          <Input
            placeholder="Rechercher par utilisateur, ressource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={sampleAuditLogs}
        keyExtractor={(item) => item.id}
      />
    </PageContainer>
  );
};
