import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Building,
  Home,
  AlertCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
  Plus,
  BarChart3,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Column } from '@/components/ui/Table';
import { dashboardService } from '@/services/dashboard/dashboardService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardService.getDashboardKPIs(),
  });

  const columns: Column<any>[] = [
    {
      header: 'Opération',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-xs block">{row.title}</span>
            <span className="text-[10px] text-slate-400 font-mono block">Réf. #{row.id.slice(0, 8)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'date',
      className: 'text-xs text-slate-500',
    },
    {
      header: 'Montant',
      cell: (row) => (
        <span className="font-bold text-slate-900 text-xs font-['Outfit']">
          {row.amount} FCFA
        </span>
      ),
    },
    {
      header: 'Statut',
      cell: (row) => (
        <Badge variant={row.status === 'COMPLETED' ? 'emerald' : 'amber'}>
          {row.status === 'COMPLETED' ? 'Encaissé' : 'En attente'}
        </Badge>
      ),
    },
  ];

  if (isLoading || !kpis) {
    return (
      <PageContainer
        title="Tableau de Bord Exécutif"
        description="Vue globale et temps réel sur les performances financières et l'occupation de votre patrimoine."
      >
        <div className="text-center py-24 text-xs font-medium text-slate-400">
          Chargement des indicateurs exécutifs en direct...
        </div>
      </PageContainer>
    );
  }

  // Calculate max amount for monthly chart scaling
  const maxMonthlyVal = Math.max(
    ...kpis.monthly_timeline.map((m) => Math.max(parseFloat(m.collected_rent), parseFloat(m.expenses))),
    1
  );

  return (
    <PageContainer
      title="Tableau de Bord Exécutif"
      description="Vue globale et temps réel sur les performances financières et l'occupation de votre patrimoine."
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            <FileText className="w-4 h-4 mr-1.5" />
            Rapport de Gestion
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/payments')}>
            Encaisser Loyer
          </Button>
        </div>
      }
    >
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Loyers Encaissés */}
        <Card hoverEffect>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loyers Encaissés</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] block truncate">
                {kpis.finances.total_collected_rent} FCFA
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="emerald" className="text-[10px]">
                  {kpis.finances.collection_rate_percent}% de recouvrement
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Impayés / En retard */}
        <Card hoverEffect>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Impayés & Retards</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-rose-600 font-['Outfit'] block truncate">
                {kpis.finances.total_unpaid_rent} FCFA
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-slate-500">Sur {kpis.finances.total_expected_rent} FCFA émis</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Taux d'Occupation */}
        <Card hoverEffect>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taux d'Occupation</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Home className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] block">
                {kpis.portfolio.occupancy_rate_percent}%
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-600">{kpis.portfolio.occupied_units} occupés</span> / {kpis.portfolio.vacant_units} libres
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Résultat Net d'Exploitation (NOI) */}
        <Card hoverEffect>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Résultat Net (NOI)</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-purple-700 font-['Outfit'] block truncate">
                {kpis.finances.net_operating_income} FCFA
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                Charges décaissées: {kpis.finances.total_expenses} FCFA
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: Cashflow Timeline & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left 2 Cols: Monthly Cashflow Evolution Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Évolution Mensuelle des Flux de Trésorerie (6 derniers mois)
                </CardTitle>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Loyers perçus
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-500">
                  <span className="w-2.5 h-2.5 bg-rose-400 rounded-sm inline-block" /> Dépenses
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-6 gap-3 items-end h-48 pt-6">
                {kpis.monthly_timeline.map((m) => {
                  const rentHeight = maxMonthlyVal > 0 ? (parseFloat(m.collected_rent) / maxMonthlyVal) * 100 : 0;
                  const expHeight = maxMonthlyVal > 0 ? (parseFloat(m.expenses) / maxMonthlyVal) * 100 : 0;

                  return (
                    <div key={m.month_key} className="flex flex-col items-center gap-2 h-full justify-end">
                      <div className="flex items-end gap-1.5 w-full justify-center h-36">
                        {/* Rent bar */}
                        <div
                          className="w-4 bg-emerald-500 rounded-t-md transition-all duration-500 hover:opacity-80"
                          style={{ height: `${Math.max(rentHeight, 4)}%` }}
                          title={`Loyers perçus: ${m.collected_rent} FCFA`}
                        />
                        {/* Expense bar */}
                        <div
                          className="w-4 bg-rose-400 rounded-t-md transition-all duration-500 hover:opacity-80"
                          style={{ height: `${Math.max(expHeight, 4)}%` }}
                          title={`Dépenses: ${m.expenses} FCFA`}
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-700 block">{m.month_label}</span>
                        <span className="text-[9px] font-mono text-emerald-700 block font-semibold">
                          {m.net_cashflow}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Recent Operations Table */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Derniers Encaissements & Règlements
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>
                Journal des paiements
              </Button>
            </CardHeader>
            <Table
              columns={columns}
              data={kpis.recent_activities}
              keyExtractor={(item) => item.id}
            />
          </Card>
        </div>

        {/* Right 1 Col: Operational Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-semibold"
                leftIcon={<Receipt className="w-4 h-4 text-blue-600" />}
                onClick={() => navigate('/billing')}
              >
                Générer les avis d'échéance du mois
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-semibold"
                leftIcon={<CreditCard className="w-4 h-4 text-emerald-600" />}
                onClick={() => navigate('/payments')}
              >
                Enregistrer un versement de loyer
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-semibold"
                leftIcon={<AlertCircle className="w-4 h-4 text-amber-600" />}
                onClick={() => navigate('/maintenance')}
              >
                Déclarer un incident de maintenance
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-semibold"
                leftIcon={<FileText className="w-4 h-4 text-purple-600" />}
                onClick={() => navigate('/reports')}
              >
                Consulter le compte de résultat consolidé
              </Button>
            </CardBody>
          </Card>

          {/* Operational Alerts Card */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="border-b border-amber-200/60 pb-3">
              <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertes & Échéances Critiques
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-3 text-xs">
              {/* Leases Expiring Soon */}
              {kpis.alerts.expiring_leases.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    Baux expirant sous 60 jours ({kpis.alerts.expiring_leases.length}) :
                  </span>
                  {kpis.alerts.expiring_leases.map((l) => (
                    <div key={l.id} className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{l.tenant_name}</span>
                        <span className="text-[10px] text-slate-500">{l.property_name} ({l.unit_number})</span>
                      </div>
                      <Badge variant="amber">{l.days_remaining}j restants</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Aucun bail en fin de contrat sous 60j.</span>
                </div>
              )}

              {/* Overdue Invoices Alert */}
              {kpis.alerts.overdue_invoices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-200/50">
                  <span className="text-[11px] font-bold text-rose-900 block">
                    Loyers en retard d'échéance ({kpis.alerts.overdue_invoices.length}) :
                  </span>
                  {kpis.alerts.overdue_invoices.map((inv) => (
                    <div key={inv.id} className="p-2.5 bg-white rounded-xl border border-rose-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{inv.tenant_name}</span>
                        <span className="text-[10px] text-slate-500">Échéance du {inv.due_date}</span>
                      </div>
                      <span className="font-bold text-rose-600 font-['Outfit']">
                        {inv.remaining_balance} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
