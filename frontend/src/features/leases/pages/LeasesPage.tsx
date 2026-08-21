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
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { leaseService, LeaseCreatePayload } from '@/services/leases/leaseService';
import { propertyService } from '@/services/properties/propertyService';
import { tenantService } from '@/services/tenants/tenantService';
import { LeaseStatus, PaymentFrequency } from '@/types';

export const LeasesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<LeaseCreatePayload>({
    unit: '',
    tenant: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    rent_amount: '',
    charges_amount: '0',
    deposit_amount: '',
    payment_day_of_month: 5,
    payment_frequency: 'MONTHLY',
    status: 'ACTIVE',
    terms_and_conditions: '',
  });

  // Query properties & units
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Query available/vacant units
  const { data: vacantUnits = [] } = useQuery({
    queryKey: ['units', { status: 'VACANT' }],
    queryFn: () => propertyService.getUnits({ status: 'VACANT' }),
  });

  // Query tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getTenants(),
  });

  // Query leases list
  const { data: leases = [], isLoading } = useQuery({
    queryKey: ['leases', { search, status: statusFilter, property: propertyFilter }],
    queryFn: () =>
      leaseService.getLeases({
        search: search || undefined,
        status: statusFilter || undefined,
        property: propertyFilter || undefined,
      }),
  });

  // Query lease stats
  const { data: stats } = useQuery({
    queryKey: ['lease-stats'],
    queryFn: () => leaseService.getLeaseStats(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: LeaseCreatePayload) => leaseService.createLease(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setFormData({
        unit: '',
        tenant: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        rent_amount: '',
        charges_amount: '0',
        deposit_amount: '',
        payment_day_of_month: 5,
        payment_frequency: 'MONTHLY',
        status: 'ACTIVE',
        terms_and_conditions: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la création du contrat de bail.');
    },
  });

  const handleUnitSelectChange = (unitId: string) => {
    const selected = vacantUnits.find((u) => u.id === unitId);
    if (selected) {
      const baseRent = parseFloat(selected.base_rent_amount || '0');
      const charges = parseFloat(selected.service_charges_amount || '0');
      const depositDefault = baseRent * 2; // Typically 2 months rent
      setFormData({
        ...formData,
        unit: unitId,
        rent_amount: baseRent.toString(),
        charges_amount: charges.toString(),
        deposit_amount: depositDefault.toString(),
      });
    } else {
      setFormData({ ...formData, unit: unitId });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unit) {
      setErrorMessage('Veuillez sélectionner un logement vacant.');
      return;
    }
    if (!formData.tenant) {
      setErrorMessage('Veuillez sélectionner un locataire titulaire.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: LeaseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="emerald">Actif (En cours)</Badge>;
      case 'DRAFT':
        return <Badge variant="blue">Brouillon</Badge>;
      case 'TERMINATED':
        return <Badge variant="slate">Résilié / Sortie</Badge>;
      case 'EXPIRED':
        return <Badge variant="amber">Expiré</Badge>;
      case 'CANCELLED':
        return <Badge variant="rose">Annulé</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  const getDepositBadge = (deposit?: any) => {
    if (!deposit) return <Badge variant="slate">-</Badge>;
    switch (deposit.status) {
      case 'PAID':
        return <Badge variant="emerald">Caution Encaissée</Badge>;
      case 'PENDING':
        return <Badge variant="amber">Caution En Attente</Badge>;
      case 'REFUNDED':
        return <Badge variant="slate">Restituée</Badge>;
      case 'PARTIALLY_REFUNDED':
        return <Badge variant="slate">Partiellement Restituée</Badge>;
      case 'RETAINED':
        return <Badge variant="rose">Retenue</Badge>;
      default:
        return <Badge variant="slate">{deposit.status}</Badge>;
    }
  };

  return (
    <PageContainer
      title="Contrats de Bail & Cautions"
      description="Gestion des engagements contractuels, suivi des dépôts de garantie et historique des locations."
      action={
        <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Nouveau Contrat de Bail
        </Button>
      }
    >
      {/* KPI Stats Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Baux Actifs en Cours</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block">
                {stats.active_leases_count} contrats
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Brouillons & En Préparation</span>
              <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
                {stats.draft_leases_count} baux
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Loyer Mensuel Contractualisé</span>
              <span className="text-xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_active_monthly_rent} FCFA
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cautions Encaissées en Dépôt</span>
              <span className="text-xl font-bold text-blue-700 font-['Outfit'] mt-1 block truncate">
                {stats.total_deposits_collected} FCFA
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder="Rechercher par n° bail, locataire, lot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les statuts de bail' },
            { value: 'ACTIVE', label: 'Baux Actifs (En cours)' },
            { value: 'DRAFT', label: 'Brouillons' },
            { value: 'TERMINATED', label: 'Résiliés (Sorties effectuées)' },
            { value: 'EXPIRED', label: 'Expirés' },
          ]}
        />

        <Select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les immeubles' },
            ...properties.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {/* Leases Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des baux...</div>
          ) : leases.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun contrat de bail trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Créez un bail pour assigner un locataire à un logement disponible et initialiser la facturation.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Rédiger un premier bail
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Réf. Contrat</th>
                    <th className="px-6 py-3">Locataire</th>
                    <th className="px-6 py-3">Bien / Logement</th>
                    <th className="px-6 py-3">Période</th>
                    <th className="px-6 py-3">Loyer Total</th>
                    <th className="px-6 py-3">Caution</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leases.map((lease) => (
                    <tr key={lease.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {lease.lease_number}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{lease.tenant_name}</span>
                        <span className="text-slate-400 text-[11px]">{lease.tenant_phone}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">{lease.property_name}</span>
                        <span className="text-slate-500 font-mono text-[11px]">Lot {lease.unit_number}</span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        <span>Du {lease.start_date}</span>
                        <span className="text-slate-400 block text-[11px]">
                          {lease.end_date ? `Au ${lease.end_date}` : 'Durée indéterminée'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {lease.total_monthly_amount} FCFA
                        <span className="text-slate-400 font-normal text-[10px] block">/ mois</span>
                      </td>

                      <td className="px-6 py-4">
                        {getDepositBadge(lease.deposit)}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(lease.status)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/leases/${lease.id}`)}
                        >
                          Fiche Bail
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

      {/* Modal Créer Bail */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Rédiger un Nouveau Contrat de Bail"
        description="Associez un logement vacant à un locataire et définissez les conditions financières."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Logement Vacant"
              required
              value={formData.unit}
              onChange={(e) => handleUnitSelectChange(e.target.value)}
              options={[
                { value: '', label: '-- Sélectionner un lot libre --' },
                ...vacantUnits.map((u) => ({
                  value: u.id,
                  label: `${u.property_name} - Lot ${u.unit_number} (${u.total_rent_amount} FCFA)`,
                })),
              ]}
            />

            <Select
              label="Locataire Titulaire"
              required
              value={formData.tenant}
              onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
              options={[
                { value: '', label: '-- Sélectionner un locataire --' },
                ...tenants.map((t) => ({
                  value: t.id,
                  label: `${t.full_name} (${t.phone_number})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date de prise d'effet (entrée)"
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="Date de fin de bail (optionnel)"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Loyer mensuel HC (FCFA)"
              type="number"
              required
              placeholder="ex: 250000"
              value={formData.rent_amount}
              onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
            />
            <Input
              label="Provisions charges (FCFA)"
              type="number"
              placeholder="ex: 20000"
              value={formData.charges_amount}
              onChange={(e) => setFormData({ ...formData, charges_amount: e.target.value })}
            />
            <Input
              label="Dépôt de garantie (FCFA)"
              type="number"
              placeholder="ex: 500000"
              value={formData.deposit_amount}
              onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Jour d'échéance (1 à 31)"
              type="number"
              min={1}
              max={31}
              value={formData.payment_day_of_month}
              onChange={(e) => setFormData({ ...formData, payment_day_of_month: parseInt(e.target.value) || 5 })}
            />
            <Select
              label="Périodicité"
              value={formData.payment_frequency}
              onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value as PaymentFrequency })}
              options={[
                { value: 'MONTHLY', label: 'Mensuelle' },
                { value: 'QUARTERLY', label: 'Trimestrielle' },
                { value: 'SEMI_ANNUAL', label: 'Semestrielle' },
                { value: 'ANNUAL', label: 'Annuelle' },
              ]}
            />
            <Select
              label="Statut initial"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as LeaseStatus })}
              options={[
                { value: 'ACTIVE', label: 'Actif (Entrée immédiate)' },
                { value: 'DRAFT', label: 'Brouillon' },
              ]}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Valider le contrat de bail
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
