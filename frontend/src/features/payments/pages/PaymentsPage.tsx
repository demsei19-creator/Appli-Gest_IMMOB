import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileCheck2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { paymentService, PaymentCreatePayload } from '@/services/payments/paymentService';
import { tenantService } from '@/services/tenants/tenantService';
import { PaymentMethod, PaymentStatus } from '@/types';

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<PaymentCreatePayload>({
    tenant: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    notes: '',
    auto_allocate_fifo: true,
  });

  // Query tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getTenants(),
  });

  // Query payments list
  const { data: payments = [], isLoading } = useQuery({
    queryKey: [
      'payments',
      {
        month: selectedMonth,
        year: selectedYear,
        method: methodFilter,
        tenant: tenantFilter,
        search,
      },
    ],
    queryFn: () =>
      paymentService.getPayments({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
        method: methodFilter || undefined,
        tenant: tenantFilter || undefined,
        search: search || undefined,
      }),
  });

  // Query payments stats
  const { data: stats } = useQuery({
    queryKey: ['payment-stats', { month: selectedMonth, year: selectedYear }],
    queryFn: () =>
      paymentService.getPaymentStats({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
      }),
  });

  // Create payment mutation
  const createMutation = useMutation({
    mutationFn: (payload: PaymentCreatePayload) => paymentService.createPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setFormData({
        tenant: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'BANK_TRANSFER',
        reference_number: '',
        notes: '',
        auto_allocate_fifo: true,
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement du paiement.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenant) {
      setErrorMessage('Veuillez sélectionner un locataire.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount.toString()) <= 0) {
      setErrorMessage('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Badge variant="blue">Virement Bancaire</Badge>;
      case 'CASH':
        return <Badge variant="emerald">Espèces</Badge>;
      case 'CHECK':
        return <Badge variant="amber">Chèque</Badge>;
      case 'CARD':
        return <Badge variant="purple">Carte Bancaire</Badge>;
      case 'DIRECT_DEBIT':
        return <Badge variant="slate">Prélèvement</Badge>;
      default:
        return <Badge variant="slate">Mobile Money / Autre</Badge>;
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald">Encaissé / Validé</Badge>;
      case 'PENDING':
        return <Badge variant="amber">En Attente</Badge>;
      case 'CANCELLED':
        return <Badge variant="rose">Annulé / Rejeté</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <PageContainer
      title="Paiements & Quittances"
      description="Journal des encaissements de loyers, ventilation FIFO sur factures et émission de quittances officielles."
      action={
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
        >
          Enregistrer un Règlement
        </Button>
      }
    >
      {/* Financial KPIs Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Encaissé (Période)</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block truncate">
                {stats.total_collected_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{stats.total_payments_count} règlements enregistrés</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Virements Bancaires</span>
              <span className="text-xl font-bold text-blue-600 font-['Outfit'] mt-1 block truncate">
                {stats.bank_transfer_amount} FCFA
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Espèces (Guichet)</span>
              <span className="text-xl font-bold text-emerald-700 font-['Outfit'] mt-1 block truncate">
                {stats.cash_amount} FCFA
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chèques & Mobile Money</span>
              <span className="text-xl font-bold text-amber-600 font-['Outfit'] mt-1 block truncate">
                {(parseFloat(stats.check_amount || '0') + parseFloat(stats.other_amount || '0')).toFixed(2)} FCFA
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Period & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
        <Input
          placeholder="Rechercher par réf paiement, quittance, locataire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="sm:col-span-2"
        />

        <Select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les modes de règlement' },
            { value: 'BANK_TRANSFER', label: 'Virement Bancaire' },
            { value: 'CASH', label: 'Espèces' },
            { value: 'CHECK', label: 'Chèque' },
            { value: 'OTHER', label: 'Mobile Money / Autre' },
          ]}
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
      </div>

      {/* Payments Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des encaissements...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun paiement enregistré pour cette période</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Enregistrez un règlement locatif reçu. Le système ventilera automatiquement le montant sur les factures les plus anciennes.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Enregistrer un premier règlement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Réf. Paiement</th>
                    <th className="px-6 py-3">N° Quittance</th>
                    <th className="px-6 py-3">Locataire</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Mode & Réf</th>
                    <th className="px-6 py-3">Montant Encaissé</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {p.payment_number}
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-blue-600">
                        {p.receipt_number || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{p.tenant_name}</span>
                        <span className="text-slate-400 text-[11px]">{p.tenant_phone}</span>
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {p.payment_date}
                      </td>

                      <td className="px-6 py-4">
                        <div>{getMethodBadge(p.payment_method)}</div>
                        {p.reference_number && (
                          <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                            Réf : {p.reference_number}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                        {p.amount} FCFA
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(p.status)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<FileCheck2 className="w-3.5 h-3.5 text-blue-600" />}
                          onClick={() => navigate(`/payments/${p.id}/receipt`)}
                        >
                          Quittance
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal Enregistrer Paiement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer un Règlement de Loyer"
        description="Saisissez les informations de l'encaissement. L'algorithme FIFO affectera automatiquement le montant aux factures les plus anciennes."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Select
            label="Locataire Émetteur"
            required
            value={formData.tenant}
            onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
            options={[
              { value: '', label: '-- Sélectionner le locataire payeur --' },
              ...tenants.map((t) => ({
                value: t.id,
                label: `${t.full_name} (${t.phone_number})`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Montant Perçu (FCFA)"
              type="number"
              required
              placeholder="ex: 350000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <Input
              label="Date d'encaissement"
              type="date"
              required
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Mode de règlement"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
              options={[
                { value: 'BANK_TRANSFER', label: 'Virement Bancaire' },
                { value: 'CASH', label: 'Espèces (Guichet)' },
                { value: 'CHECK', label: 'Chèque' },
                { value: 'OTHER', label: 'Mobile Money (Orange/Wave/MTN)' },
                { value: 'CARD', label: 'Carte Bancaire' },
              ]}
            />
            <Input
              label="Référence transaction / Chèque"
              placeholder="ex: VIR-778899 ou CHQ-00124"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            />
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Allocation Automatique Chronologique (FIFO)</span>
              <span>
                Le montant sera automatiquement imputé sur les arriérés et factures les plus anciennes du locataire, et une quittance officielle sera immédiatement générée.
              </span>
            </div>
          </div>

          <Input
            label="Notes / Remarques"
            placeholder="ex: Reçu en main propre par l'intendant..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Valider et émettre la quittance
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
