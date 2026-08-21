import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DoorOpen,
  Building2,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  Zap,
  Droplets,
  Maximize2,
  Edit,
  RotateCcw,
  AlertCircle,
  FileText,
  CreditCard,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { propertyService } from '@/services/properties/propertyService';
import { UnitStatus } from '@/types';

export const UnitDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<UnitStatus>('VACANT');
  const [statusReason, setStatusReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit-detail', id],
    queryFn: () => propertyService.getUnitDetail(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: () => propertyService.updateUnitStatus(id!, newStatus, statusReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      setIsStatusModalOpen(false);
      setStatusReason('');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la modification du statut.');
    },
  });

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    updateStatusMutation.mutate();
  };

  const getStatusBadge = (status: UnitStatus) => {
    switch (status) {
      case 'OCCUPIED':
        return <Badge variant="emerald">Occupé</Badge>;
      case 'VACANT':
        return <Badge variant="blue">Disponible</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="amber">En travaux</Badge>;
      case 'RESERVED':
        return <Badge variant="slate">Réservé</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement du logement...</div>
      </PageContainer>
    );
  }

  if (!unit) {
    return (
      <PageContainer title="Logement introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Ce logement n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/units')}>Retour au catalogue</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Lot ${unit.unit_number}`}
      description={`${unit.property_name} • ${unit.floor || 'RDC'} • ${unit.unit_type_display || unit.unit_type}`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/units')}>
            Retour aux logements
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              setNewStatus(unit.status);
              setIsStatusModalOpen(true);
            }}
          >
            Changer de statut
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Characteristics & Tenant Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Caractéristiques du Logement</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Spécifications techniques et inventaire.</p>
              </div>
              <div>{getStatusBadge(unit.status)}</div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Typologie</span>
                  <span className="font-bold text-slate-900 text-sm">{unit.unit_type_display || unit.unit_type}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Surface Habitable</span>
                  <span className="font-bold text-slate-900 text-sm">{unit.surface_area_sqm ? `${unit.surface_area_sqm} m²` : 'Non renseignée'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Pièces & Salles d'eau</span>
                  <span className="font-bold text-slate-900 text-sm">{unit.rooms_count} pièce(s) • {unit.bathrooms_count} SDB</span>
                </div>
              </div>

              {/* Meters Info */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Compteurs & Branchements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Compteur Eau</span>
                      <span className="font-mono font-semibold text-slate-900">{unit.water_meter_number || 'Non renseigné'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-slate-400 block">Compteur Électricité</span>
                      <span className="font-mono font-semibold text-slate-900">{unit.electricity_meter_number || 'Non renseigné'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {unit.description && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">Description & Équipements</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{unit.description}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Current Lease & Tenant Card */}
          <Card>
            <CardHeader>
              <CardTitle>Situation Locative Actuelle</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Détails du bail en cours d'exécution.</p>
            </CardHeader>
            <CardBody>
              {(unit as any).current_lease ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-['Outfit']">
                        {(unit as any).current_lease.tenant_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{(unit as any).current_lease.tenant_name}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {(unit as any).current_lease.tenant_phone}
                          </span>
                          {(unit as any).current_lease.tenant_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {(unit as any).current_lease.tenant_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="emerald">Bail Actif</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                    <div>
                      <span className="text-slate-400 block">Date de début</span>
                      <span className="font-semibold text-slate-800">{(unit as any).current_lease.start_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Échéance mensuelle</span>
                      <span className="font-semibold text-slate-800">Le {(unit as any).current_lease.payment_day_of_month} du mois</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Loyer mensuel facturé</span>
                      <span className="font-bold text-slate-900">{(unit as any).current_lease.total_monthly_amount} FCFA</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span>Aucun contrat de bail actif sur ce logement. Le lot est libre pour une nouvelle location.</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Financials & Parent Property */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Financiers</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Loyer de base hors charges</span>
                <span className="font-semibold text-slate-900">{unit.base_rent_amount} FCFA</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Provisions sur charges</span>
                <span className="font-semibold text-slate-900">{unit.service_charges_amount} FCFA</span>
              </div>
              <div className="flex justify-between py-3 bg-blue-50/50 px-3 rounded-xl">
                <span className="font-bold text-blue-900">Loyer Total Mensuel</span>
                <span className="font-bold text-blue-700 text-sm">{unit.total_rent_amount} FCFA</span>
              </div>
            </CardBody>
          </Card>

          {/* Parent Property Quick Card */}
          <Card>
            <CardHeader>
              <CardTitle>Immeuble de Rattachement</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{unit.property_name}</span>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/properties/${unit.property}`)}
                >
                  Voir la fiche de l'immeuble
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal Changement de Statut */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Changer le statut du logement"
        description={`Mettre à jour la disponibilité pour le lot ${unit.unit_number}.`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Select
            label="Nouveau statut"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as UnitStatus)}
            options={[
              { value: 'VACANT', label: 'Disponible (Libre)' },
              { value: 'MAINTENANCE', label: 'En travaux / Rénovation' },
              { value: 'RESERVED', label: 'Réservé' },
            ]}
          />

          <Input
            label="Motif / Observation (optionnel)"
            placeholder="ex: Rénovation peinture avant mise en location"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsStatusModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={updateStatusMutation.isPending}>
              Mettre à jour le statut
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
