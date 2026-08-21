import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  Search,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  User,
  DollarSign,
  Flame,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { maintenanceService, MaintenanceCreatePayload } from '@/services/maintenance/maintenanceService';
import { propertyService } from '@/services/properties/propertyService';
import { supplierService } from '@/services/suppliers/supplierService';
import { tenantService } from '@/services/tenants/tenantService';
import { MaintenancePriority, MaintenanceStatus } from '@/types';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<MaintenanceCreatePayload>({
    property: '',
    unit: '',
    reported_by_tenant: '',
    supplier: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    estimated_cost: '',
  });

  // Query properties for filter & form
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Query selected property units
  const selectedProperty = properties.find((p) => p.id === formData.property);
  const units = selectedProperty?.units || [];

  // Query suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers(),
  });

  // Query tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getTenants(),
  });

  // Query maintenance tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: [
      'maintenance-tickets',
      {
        status: statusFilter,
        priority: priorityFilter,
        property: propertyFilter,
        search,
      },
    ],
    queryFn: () =>
      maintenanceService.getMaintenanceRequests({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        property: propertyFilter || undefined,
        search: search || undefined,
      }),
  });

  // Query maintenance KPIs
  const { data: stats } = useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: () => maintenanceService.getMaintenanceStats(),
  });

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: (payload: MaintenanceCreatePayload) => {
      const formatted = {
        ...payload,
        unit: payload.unit || undefined,
        reported_by_tenant: payload.reported_by_tenant || undefined,
        supplier: payload.supplier || undefined,
        estimated_cost: payload.estimated_cost ? payload.estimated_cost : undefined,
      };
      return maintenanceService.createMaintenanceRequest(formatted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
      setIsModalOpen(false);
      setFormData({
        property: '',
        unit: '',
        reported_by_tenant: '',
        supplier: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        estimated_cost: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de la création du ticket d'intervention.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property) {
      setErrorMessage('Veuillez sélectionner un immeuble.');
      return;
    }
    if (!formData.title.trim()) {
      setErrorMessage("Veuillez saisir l'objet de l'intervention.");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage('Veuillez décrire le problème constaté.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="rose">Critique / Urgente</Badge>;
      case 'HIGH':
        return <Badge variant="amber">Haute</Badge>;
      case 'MEDIUM':
        return <Badge variant="blue">Moyenne</Badge>;
      case 'LOW':
        return <Badge variant="slate">Basse</Badge>;
      default:
        return <Badge variant="slate">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'REPORTED':
        return <Badge variant="slate">Signalée</Badge>;
      case 'ASSIGNED':
        return <Badge variant="blue">Assignée</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="amber">En Cours</Badge>;
      case 'COMPLETED':
        return <Badge variant="emerald">Terminée & Validée</Badge>;
      case 'CANCELLED':
        return <Badge variant="rose">Annulée</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <PageContainer
      title="Maintenance & Travaux"
      description="Gestion des incidents techniques, suivi des interventions d'artisans et contrôle des coûts de réparation."
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={() => navigate('/suppliers')}>
            Annuaire Fournisseurs & Artisans
          </Button>

          <Button
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setErrorMessage(null);
              setIsModalOpen(true);
            }}
          >
            Déclarer un Incident
          </Button>
        </div>
      }
    >
      {/* Maintenance KPIs */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dossiers Ouverts</span>
              <span className="text-2xl font-bold text-amber-600 font-['Outfit'] mt-1 block">
                {stats.open_requests}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">sur {stats.total_requests} tickets enregistrés</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Urgents / Critiques</span>
              <span className="text-2xl font-bold text-rose-600 font-['Outfit'] mt-1 block">
                {stats.urgent_open_requests}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">nécessitent une action rapide</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Clôturés ce Mois</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block">
                {stats.completed_this_month}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">travaux terminés & validés</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dépenses Travaux Réalisés</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_actual_cost} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">coût réel cumulé validé</span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <Input
          placeholder="Rechercher ticket, problème, immeuble, artisan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'REPORTED', label: 'Signalée' },
            { value: 'ASSIGNED', label: 'Assignée' },
            { value: 'IN_PROGRESS', label: 'En cours de travaux' },
            { value: 'COMPLETED', label: 'Terminée & Validée' },
            { value: 'CANCELLED', label: 'Annulée' },
          ]}
        />

        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les degrés d’urgence' },
            { value: 'URGENT', label: 'Critique / Urgente' },
            { value: 'HIGH', label: 'Haute' },
            { value: 'MEDIUM', label: 'Moyenne' },
            { value: 'LOW', label: 'Basse' },
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

      {/* Tickets Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des dossiers de maintenance...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun ticket de maintenance trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Déclarez une demande d'intervention, affectez un artisan et suivez l'avancement des réparations.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Déclarer un incident
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">N° Ticket</th>
                    <th className="px-6 py-3">Urgence</th>
                    <th className="px-6 py-3">Objet du Problème</th>
                    <th className="px-6 py-3">Immeuble & Lot</th>
                    <th className="px-6 py-3">Prestataire Assigné</th>
                    <th className="px-6 py-3">Coût (Devis / Réel)</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {t.ticket_number || '-'}
                      </td>

                      <td className="px-6 py-4">
                        {getPriorityBadge(t.priority)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{t.title}</span>
                        <span className="text-slate-400 text-[11px] line-clamp-1">{t.description}</span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">{t.property_name}</span>
                        <span className="text-slate-500 text-[11px]">
                          {t.unit_number ? `Lot ${t.unit_number}` : 'Parties communes'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {t.supplier_name ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{t.supplier_name}</span>
                            <span className="text-slate-400 text-[11px]">{t.supplier_category}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Non assigné</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {t.actual_cost ? (
                          <span className="font-bold text-emerald-600 text-xs block">
                            {t.actual_cost} FCFA <span className="text-[10px] font-normal text-slate-400">(réel)</span>
                          </span>
                        ) : t.estimated_cost ? (
                          <span className="font-medium text-amber-600 text-xs block">
                            ~{t.estimated_cost} FCFA <span className="text-[10px] font-normal text-slate-400">(devis)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(t.status)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/maintenance/${t.id}`)}
                        >
                          Détails
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

      {/* Modal Déclarer un Incident */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Déclarer un Incident / Demande de Travaux"
        description="Renseignez le problème technique constaté, son degré d'urgence et le prestataire recommandé."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Immeuble concerné"
              required
              value={formData.property}
              onChange={(e) => setFormData({ ...formData, property: e.target.value, unit: '' })}
              options={[
                { value: '', label: '-- Sélectionner un immeuble --' },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Logement (Optionnel)"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: '', label: 'Parties communes de l’immeuble' },
                ...units.map((u) => ({
                  value: u.id,
                  label: `Lot ${u.unit_number} (${u.unit_type_display || u.unit_type})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Locataire signalant (Optionnel)"
              value={formData.reported_by_tenant}
              onChange={(e) => setFormData({ ...formData, reported_by_tenant: e.target.value })}
              options={[
                { value: '', label: 'Signalé par le gestionnaire / syndic' },
                ...tenants.map((t) => ({
                  value: t.id,
                  label: `${t.full_name} (${t.phone_number})`,
                })),
              ]}
            />

            <Select
              label="Degré d’urgence / Priorité"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
              options={[
                { value: 'LOW', label: 'Basse (Entretien régulier)' },
                { value: 'MEDIUM', label: 'Moyenne (Réparation courante)' },
                { value: 'HIGH', label: 'Haute (Gêne importante)' },
                { value: 'URGENT', label: 'Critique / Urgente (Dégât des eaux, panne totale)' },
              ]}
            />
          </div>

          <Input
            label="Objet de l’incident / Titre"
            required
            placeholder="ex: Fuite d'eau sous évier cuisine ou Disjoncteur défectueux..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description détaillée du problème <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Indiquez les constatations précises, l'emplacement exact et les mesures d'urgence déjà prises..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <Select
              label="Assigner un Artisan / Prestataire (Optionnel)"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              options={[
                { value: '', label: '-- Assigner plus tard --' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.category_display})`,
                })),
              ]}
            />

            <Input
              label="Devis estimatif prévisionnel (FCFA)"
              type="number"
              placeholder="ex: 50000"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Créer le ticket d'intervention
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
