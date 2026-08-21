import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Percent,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  billingService,
  RentInvoiceCreatePayload,
  BulkInvoiceGeneratePayload,
  BulkInvoiceGenerateResult,
} from '@/services/billing/billingService';
import { propertyService } from '@/services/properties/propertyService';
import { leaseService } from '@/services/leases/leaseService';
import { InvoiceStatus } from '@/types';

export const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkInvoiceGenerateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single create form state
  const [singleFormData, setSingleFormData] = useState<RentInvoiceCreatePayload>({
    lease: '',
    period_start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
    due_date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0],
    rent_amount: '',
    charges_amount: '0',
    notes: '',
  });

  // Query properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Query active leases for single issuance
  const { data: activeLeases = [] } = useQuery({
    queryKey: ['leases', { status: 'ACTIVE' }],
    queryFn: () => leaseService.getLeases({ status: 'ACTIVE' }),
  });

  // Query invoices list
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: [
      'invoices',
      {
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter,
        property: propertyFilter,
        search,
      },
    ],
    queryFn: () =>
      billingService.getInvoices({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
        status: statusFilter || undefined,
        property: propertyFilter || undefined,
        search: search || undefined,
      }),
  });

  // Query billing stats
  const { data: stats } = useQuery({
    queryKey: ['billing-stats', { month: selectedMonth, year: selectedYear }],
    queryFn: () =>
      billingService.getBillingStats({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
      }),
  });

  // Bulk generate mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: (payload: BulkInvoiceGeneratePayload) => billingService.generateBulkInvoices(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
      setBulkResult(result);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la génération en masse.');
    },
  });

  // Single create mutation
  const singleCreateMutation = useMutation({
    mutationFn: (payload: RentInvoiceCreatePayload) => billingService.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
      setIsSingleModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'émission de la facture.");
    },
  });

  const handleLeaseSelectChange = (leaseId: string) => {
    const selected = activeLeases.find((l) => l.id === leaseId);
    if (selected) {
      setSingleFormData({
        ...singleFormData,
        lease: leaseId,
        rent_amount: selected.rent_amount,
        charges_amount: selected.charges_amount,
      });
    } else {
      setSingleFormData({ ...singleFormData, lease: leaseId });
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald">Soldé / Payé</Badge>;
      case 'PARTIAL':
        return <Badge variant="blue">Paiement Partiel</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose">En Retard / Impayé</Badge>;
      case 'UNPAID':
        return <Badge variant="amber">Non Payé (En attente)</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">Annulé</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <PageContainer
      title="Facturation & Avis d'Échéance"
      description="Émission des appels de loyers, suivi du recouvrement mensuel et gestion des impayés."
      action={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Sparkles className="w-4 h-4 text-blue-600" />}
            onClick={() => {
              setBulkResult(null);
              setErrorMessage(null);
              setIsBulkModalOpen(true);
            }}
          >
            Génération en Masse (1-Clic)
          </Button>
          <Button
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setErrorMessage(null);
              setIsSingleModalOpen(true);
            }}
          >
            Émettre un Avis Unitaire
          </Button>
        </div>
      }
    >
      {/* Recovery KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Facturé (Attendu)</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_expected_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{stats.total_invoices_count} avis d'échéance</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Encaissé / Perçu</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block truncate">
                {stats.total_paid_amount} FCFA
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">{stats.paid_invoices_count} factures soldées</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Reste à Recouvrer / Impayés</span>
              <span className="text-2xl font-bold text-rose-600 font-['Outfit'] mt-1 block truncate">
                {stats.total_unpaid_amount} FCFA
              </span>
              <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                {stats.overdue_invoices_count} en retard • {stats.unpaid_invoices_count} en attente
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Taux de Recouvrement</span>
              <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
                {stats.recovery_rate}%
              </span>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.recovery_rate, 100)}%` }}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Period & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
        <Input
          placeholder="Rechercher par n° facture, locataire, lot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="sm:col-span-2"
        />

        <Select
          value={selectedMonth.toString()}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          options={[
            { value: '1', label: 'Janvier' },
            { value: '2', label: 'Février' },
            { value: '3', label: 'Mars' },
            { value: '4', label: 'Avril' },
            { value: '5', label: 'Mai' },
            { value: '6', label: 'Juin' },
            { value: '7', label: 'Juillet' },
            { value: '8', label: 'Août' },
            { value: '9', label: 'Septembre' },
            { value: '10', label: 'Octobre' },
            { value: '11', label: 'Novembre' },
            { value: '12', label: 'Décembre' },
          ]}
        />

        <Select
          value={selectedYear.toString()}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          options={[
            { value: '2025', label: '2025' },
            { value: '2026', label: '2026' },
            { value: '2027', label: '2027' },
          ]}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'UNPAID', label: 'Non Payé (En attente)' },
            { value: 'OVERDUE', label: 'En Retard / Impayé' },
            { value: 'PARTIAL', label: 'Paiement Partiel' },
            { value: 'PAID', label: 'Soldé / Payé' },
            { value: 'CANCELLED', label: 'Annulé' },
          ]}
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des avis d'échéance...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun avis d'échéance trouvé pour cette période</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Utilisez la génération en masse 1-clic pour émettre les avis d'échéance de tous vos locataires en place.
              </p>
              <Button size="sm" onClick={() => setIsBulkModalOpen(true)}>
                Générer les avis du mois
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Réf. Avis</th>
                    <th className="px-6 py-3">Locataire</th>
                    <th className="px-6 py-3">Bien / Lot</th>
                    <th className="px-6 py-3">Période & Échéance</th>
                    <th className="px-6 py-3">Montant Attendu</th>
                    <th className="px-6 py-3">Payé / Reste Dû</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const paid = parseFloat(inv.total_paid || '0');
                    const expected = parseFloat(inv.total_expected || '1');
                    const pct = Math.min(Math.round((paid / expected) * 100), 100);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">
                          {inv.invoice_number}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 block">{inv.tenant_name}</span>
                          <span className="text-slate-400 text-[11px]">{inv.tenant_phone}</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800 block">{inv.property_name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">Lot {inv.unit_number}</span>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <span>Du {inv.period_start} au {inv.period_end}</span>
                          <span className="text-slate-400 block text-[11px]">
                            Échéance : <strong className="text-slate-700">{inv.due_date}</strong>
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-900">
                          {inv.total_expected} FCFA
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600">{inv.total_paid} FCFA</span>
                            <span className="text-slate-400 text-[11px]">/ {inv.remaining_balance} restant</span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {getStatusBadge(inv.status)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/billing/${inv.id}`)}
                          >
                            Avis Détaillé
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal Génération en Masse */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Génération en Masse des Avis d'Échéance"
        description="Émettez en 1-clic les avis d'échéance pour tous vos contrats de bail actifs avec déduplication intelligente."
      >
        <div className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {bulkResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Génération terminée avec succès !</span>
                </div>
                <p className="text-emerald-700">
                  <strong>{bulkResult.generated_count}</strong> avis d'échéance ont été créés pour la période.
                </p>
                {bulkResult.skipped_count > 0 && (
                  <p className="text-emerald-700">
                    <strong>{bulkResult.skipped_count}</strong> baux ont été ignorés car ils possédaient déjà une facture.
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={() => setIsBulkModalOpen(false)}>Fermer</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Mois cible"
                  value={selectedMonth.toString()}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  options={[
                    { value: '1', label: 'Janvier' },
                    { value: '2', label: 'Février' },
                    { value: '3', label: 'Mars' },
                    { value: '4', label: 'Avril' },
                    { value: '5', label: 'Mai' },
                    { value: '6', label: 'Juin' },
                    { value: '7', label: 'Juillet' },
                    { value: '8', label: 'Août' },
                    { value: '9', label: 'Septembre' },
                    { value: '10', label: 'Octobre' },
                    { value: '11', label: 'Novembre' },
                    { value: '12', label: 'Décembre' },
                  ]}
                />

                <Select
                  label="Année cible"
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  options={[
                    { value: '2025', label: '2025' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' },
                  ]}
                />
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                <p>
                  Le système va parcourir l'ensemble de vos <strong>{activeLeases.length} baux actifs</strong> et générer les appels de loyer correspondants. Les baux ayant déjà une facture pour ce mois seront automatiquement ignorés.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsBulkModalOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() =>
                    bulkGenerateMutation.mutate({
                      month: selectedMonth,
                      year: selectedYear,
                    })
                  }
                  isLoading={bulkGenerateMutation.isPending}
                >
                  Lancer la génération
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Émission Unitaire */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Émettre un Avis d'Échéance Unitaire"
        description="Créez un appel de loyer sur-mesure pour un contrat de bail spécifique."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!singleFormData.lease) {
              setErrorMessage('Veuillez sélectionner un contrat de bail.');
              return;
            }
            singleCreateMutation.mutate(singleFormData);
          }}
          className="space-y-4"
        >
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Select
            label="Contrat de Bail Actif"
            required
            value={singleFormData.lease}
            onChange={(e) => handleLeaseSelectChange(e.target.value)}
            options={[
              { value: '', label: '-- Sélectionner un contrat actif --' },
              ...activeLeases.map((l) => ({
                value: l.id,
                label: `${l.lease_number} - ${l.tenant_name} (${l.property_name} Lot ${l.unit_number})`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Début de période"
              type="date"
              required
              value={singleFormData.period_start}
              onChange={(e) => setSingleFormData({ ...singleFormData, period_start: e.target.value })}
            />
            <Input
              label="Fin de période"
              type="date"
              required
              value={singleFormData.period_end}
              onChange={(e) => setSingleFormData({ ...singleFormData, period_end: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Date d'échéance"
              type="date"
              value={singleFormData.due_date}
              onChange={(e) => setSingleFormData({ ...singleFormData, due_date: e.target.value })}
            />
            <Input
              label="Loyer net (FCFA)"
              type="number"
              value={singleFormData.rent_amount}
              onChange={(e) => setSingleFormData({ ...singleFormData, rent_amount: e.target.value })}
            />
            <Input
              label="Charges (FCFA)"
              type="number"
              value={singleFormData.charges_amount}
              onChange={(e) => setSingleFormData({ ...singleFormData, charges_amount: e.target.value })}
            />
          </div>

          <Input
            label="Notes / Remarques"
            placeholder="ex: Facturation complémentaire eau/électricité..."
            value={singleFormData.notes}
            onChange={(e) => setSingleFormData({ ...singleFormData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsSingleModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={singleCreateMutation.isPending}>
              Émettre l'avis d'échéance
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
