import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  ArrowLeft,
  Building2,
  Home,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  FileText,
  UserCheck,
  CheckCheck,
  XCircle,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { maintenanceService } from '@/services/maintenance/maintenanceService';
import { supplierService } from '@/services/suppliers/supplierService';
import { MaintenancePriority, MaintenanceStatus } from '@/types';

export const MaintenanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states for assignment
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  // Form states for status update
  const [newStatus, setNewStatus] = useState<MaintenanceStatus>('IN_PROGRESS');
  const [actualCost, setActualCost] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['maintenance-ticket', id],
    queryFn: () => maintenanceService.getMaintenanceDetail(id!),
    enabled: !!id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers(),
  });

  // Assign supplier mutation
  const assignMutation = useMutation({
    mutationFn: () =>
      maintenanceService.assignSupplier(
        id!,
        selectedSupplier,
        estimatedCost ? estimatedCost : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
      setIsAssignModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'assignation du prestataire.");
    },
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: () =>
      maintenanceService.updateStatus(
        id!,
        newStatus,
        actualCost ? actualCost : undefined,
        undefined,
        statusNotes || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
      setIsStatusModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de la mise à jour du statut.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => maintenanceService.deleteMaintenanceRequest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
      navigate('/maintenance');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de la suppression du dossier.");
    },
  });

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
        return <Badge variant="amber">En Cours de travaux</Badge>;
      case 'COMPLETED':
        return <Badge variant="emerald">Terminée & Validée</Badge>;
      case 'CANCELLED':
        return <Badge variant="rose">Annulée</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement du dossier..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement du ticket d'intervention...</div>
      </PageContainer>
    );
  }

  if (!ticket) {
    return (
      <PageContainer title="Ticket introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Ce dossier de maintenance n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/maintenance')}>Retour aux interventions</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={ticket.ticket_number || 'Dossier Intervention'}
      description={`${ticket.title} • ${ticket.property_name}`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/maintenance')}>
            Retour
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<UserCheck className="w-4 h-4" />}
            onClick={() => {
              setSelectedSupplier(ticket.supplier || '');
              setEstimatedCost(ticket.estimated_cost || '');
              setIsAssignModalOpen(true);
            }}
          >
            {ticket.supplier ? 'Changer de prestataire' : 'Assigner un prestataire'}
          </Button>

          <Button
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4" />}
            onClick={() => {
              setNewStatus(ticket.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
              setActualCost(ticket.actual_cost || '');
              setStatusNotes('');
              setIsStatusModalOpen(true);
            }}
          >
            Mettre à jour le statut
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Supprimer
          </Button>
        </div>
      }
    >
      {errorMessage && (
        <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress Lifecycle Bar */}
      <Card className="mb-6">
        <CardBody className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Avancement du dossier</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-slate-900">{ticket.title}</h3>
                  {getPriorityBadge(ticket.priority)}
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-400 block">Signalé le : {ticket.reported_date}</span>
              {ticket.completed_date && (
                <span className="text-emerald-600 font-bold block mt-0.5">Clôturé le : {ticket.completed_date}</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Description & Location */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Détail du Problème & Constatations
              </CardTitle>
            </CardHeader>
            <CardBody className="p-6 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </CardBody>
          </Card>

          {/* Location & Reporter Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  Localisation des Travaux
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Immeuble</span>
                  <span className="font-bold text-slate-900">{ticket.property_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Logement / Zone</span>
                  <span className="font-semibold text-blue-600">
                    {ticket.unit_number ? `Lot ${ticket.unit_number}` : 'Parties communes'}
                  </span>
                </div>
                {ticket.property_city && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Ville</span>
                    <span className="text-slate-700">{ticket.property_city}</span>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-600" />
                  Locataire Déclarant
                </CardTitle>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-2">
                {ticket.tenant_name ? (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nom complet</span>
                      <span className="font-bold text-slate-900">{ticket.tenant_name}</span>
                    </div>
                    {ticket.tenant_phone && (
                      <div>
                        <span className="text-slate-400 block text-[11px]">Téléphone</span>
                        <span className="text-slate-700">{ticket.tenant_phone}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 italic py-3">Incident constaté par le bailleur / syndic</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Right Column: Contractor & Financials */}
        <div className="space-y-6">
          {/* Assigned Contractor Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                Artisan / Prestataire Mandaté
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5 text-xs space-y-3">
              {ticket.supplier_name ? (
                <>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Entreprise</span>
                    <span className="font-bold text-slate-900 text-sm block">{ticket.supplier_name}</span>
                    <Badge variant="blue" className="mt-1">{ticket.supplier_category}</Badge>
                  </div>

                  {ticket.supplier_phone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ticket.supplier_phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-400 italic mb-3">Aucun artisan affecté</p>
                  <Button size="sm" variant="outline" onClick={() => setIsAssignModalOpen(true)}>
                    Assigner un artisan
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Financials Card */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Suivi Financier & Coûts
              </CardTitle>
            </CardHeader>
            <CardBody className="p-5 text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-medium">Devis Estimatif</span>
                <span className="font-bold text-slate-900">
                  {ticket.estimated_cost ? `${ticket.estimated_cost} FCFA` : 'Non estimé'}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl flex items-center justify-between border border-emerald-100">
                <span className="text-emerald-800 font-semibold">Coût Réel Final</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {ticket.actual_cost ? `${ticket.actual_cost} FCFA` : 'En attente de facture'}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal Assigner Prestataire */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assigner un Artisan / Prestataire"
        description="Sélectionnez l'artisan qualifié pour cette intervention et précisez le montant du devis."
      >
        <div className="space-y-4">
          <Select
            label="Artisan / Entreprise prestataire"
            required
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            options={[
              { value: '', label: '-- Sélectionner un artisan --' },
              ...suppliers.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.category_display}) - ${s.phone_number}`,
              })),
            ]}
          />

          <Input
            label="Devis estimatif validé (FCFA)"
            type="number"
            placeholder="ex: 45000"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => assignMutation.mutate()} isLoading={assignMutation.isPending}>
              Enregistrer l'assignation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Mettre à jour le Statut */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Mise à Jour de l'État d'Avancement"
        description="Faites progresser le statut du ticket et renseignez le montant de la facture finale."
      >
        <div className="space-y-4">
          <Select
            label="Nouveau statut du ticket"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as MaintenanceStatus)}
            options={[
              { value: 'ASSIGNED', label: 'Assignée au prestataire' },
              { value: 'IN_PROGRESS', label: 'En cours d’intervention / travaux' },
              { value: 'COMPLETED', label: 'Terminée et validée par le bailleur' },
              { value: 'CANCELLED', label: 'Annulée' },
            ]}
          />

          {newStatus === 'COMPLETED' && (
            <Input
              label="Coût réel final facturé (FCFA)"
              type="number"
              required
              placeholder="ex: 42000"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
            />
          )}

          <Input
            label="Note de suivi / Rapport d'intervention"
            placeholder="ex: Travaux terminés, robinet remplacé, aucune fuite résiduelle."
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => statusMutation.mutate()} isLoading={statusMutation.isPending}>
              Valider la mise à jour
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Supprimer */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le ticket d'intervention"
        description={`Êtes-vous sûr de vouloir supprimer le ticket ${ticket.ticket_number} ? Cette action est irréversible.`}
      >
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Annuler
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
            onClick={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          >
            Confirmer la suppression
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
};
