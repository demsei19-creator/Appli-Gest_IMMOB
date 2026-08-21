import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  Plus,
  ArrowLeft,
  Home,
  Percent,
  TrendingUp,
  Key,
  DoorOpen,
  ArrowUpRight,
  AlertCircle,
  Trash2,
  Edit,
  DollarSign,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { propertyService, UnitCreatePayload } from '@/services/properties/propertyService';
import { UnitType, UnitStatus } from '@/types';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [unitForm, setUnitForm] = useState<UnitCreatePayload>({
    property: id || '',
    unit_number: '',
    floor: '',
    unit_type: 'T2',
    surface_area_sqm: '',
    rooms_count: 2,
    bathrooms_count: 1,
    base_rent_amount: '',
    service_charges_amount: '0',
    water_meter_number: '',
    electricity_meter_number: '',
    description: '',
    status: 'VACANT',
  });

  const { data: property, isLoading } = useQuery({
    queryKey: ['property-detail', id],
    queryFn: () => propertyService.getPropertyDetail(id!),
    enabled: !!id,
  });

  const createUnitMutation = useMutation({
    mutationFn: (payload: UnitCreatePayload) => propertyService.createUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      setIsUnitModalOpen(false);
      setUnitForm({
        property: id || '',
        unit_number: '',
        floor: '',
        unit_type: 'T2',
        surface_area_sqm: '',
        rooms_count: 2,
        bathrooms_count: 1,
        base_rent_amount: '',
        service_charges_amount: '0',
        water_meter_number: '',
        electricity_meter_number: '',
        description: '',
        status: 'VACANT',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la création du lot.');
    },
  });

  const handleUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createUnitMutation.mutate({ ...unitForm, property: id! });
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
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement des données de l'immeuble...</div>
      </PageContainer>
    );
  }

  if (!property) {
    return (
      <PageContainer title="Immeuble introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Cet ensemble immobilier n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/properties')}>Retour au patrimoine</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={property.name}
      description={`${property.address}, ${property.city}`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/properties')}>
            Retour au patrimoine
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsUnitModalOpen(true)}>
            Ajouter un Lot / Logement
          </Button>
        </div>
      }
    >
      {/* Property Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Lots / Logements</span>
            <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
              {property.units_count} lots
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {property.occupied_units_count} occupés • {property.vacant_units_count} disponibles
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Taux d'Occupation</span>
            <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
              {property.occupancy_rate}%
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Potentiel Locatif Mensuel</span>
            <span className="text-xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
              {property.total_monthly_revenue_potential} FCFA
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Revenus Réels Actuels</span>
            <span className="text-xl font-bold text-emerald-600 font-['Outfit'] mt-1 block truncate">
              {property.actual_monthly_revenue} FCFA
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Units Table Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inventaire des Logements & Lots ({property.units?.length || 0})</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Liste des appartements, studios, bureaux et commerces de l'immeuble.</p>
          </div>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsUnitModalOpen(true)}>
            Nouveau lot
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {(!property.units || property.units.length === 0) ? (
            <div className="text-center py-12 text-xs text-slate-400">
              <DoorOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>Aucun logement configuré dans cet immeuble. Cliquez sur « Nouveau lot » pour commencer.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Numéro / Lot</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Étage / Pièces</th>
                    <th className="px-6 py-3">Surface</th>
                    <th className="px-6 py-3">Loyer Total</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {property.units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                        {unit.unit_number}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {unit.unit_type_display || unit.unit_type}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {unit.floor || 'RDC'} • {unit.rooms_count} pièce(s)
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {unit.surface_area_sqm ? `${unit.surface_area_sqm} m²` : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {unit.total_rent_amount} FCFA
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(unit.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/units/${unit.id}`)}
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

      {/* Modal Création Lot */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={`Ajouter un lot dans ${property.name}`}
        description="Configurez les caractéristiques techniques et financières du nouveau logement."
      >
        <form onSubmit={handleUnitSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Numéro / Porte / Référence lot"
              required
              placeholder="ex: Appartement A12"
              value={unitForm.unit_number}
              onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
            />
            <Input
              label="Étage"
              placeholder="ex: 2ème étage"
              value={unitForm.floor}
              onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type de logement"
              value={unitForm.unit_type}
              onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value as UnitType })}
              options={[
                { value: 'STUDIO', label: 'Studio' },
                { value: 'T1', label: 'Appartement T1' },
                { value: 'T2', label: 'Appartement T2' },
                { value: 'T3', label: 'Appartement T3' },
                { value: 'T4', label: 'Appartement T4' },
                { value: 'T5_PLUS', label: 'Appartement T5 ou +' },
                { value: 'VILLA', label: 'Villa' },
                { value: 'COMMERCIAL', label: 'Local Commercial / Boutique' },
                { value: 'OFFICE', label: 'Bureau' },
                { value: 'PARKING', label: 'Place de Parking / Garage' },
              ]}
            />
            <Input
              label="Surface habitable (m²)"
              type="number"
              placeholder="ex: 75.5"
              value={unitForm.surface_area_sqm}
              onChange={(e) => setUnitForm({ ...unitForm, surface_area_sqm: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Loyer de base hors charges (FCFA)"
              required
              type="number"
              placeholder="ex: 250000"
              value={unitForm.base_rent_amount}
              onChange={(e) => setUnitForm({ ...unitForm, base_rent_amount: e.target.value })}
            />
            <Input
              label="Provisions pour charges (FCFA)"
              type="number"
              placeholder="ex: 20000"
              value={unitForm.service_charges_amount}
              onChange={(e) => setUnitForm({ ...unitForm, service_charges_amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="N° Compteur Eau (optionnel)"
              placeholder="ex: SODECI-88412"
              value={unitForm.water_meter_number}
              onChange={(e) => setUnitForm({ ...unitForm, water_meter_number: e.target.value })}
            />
            <Input
              label="N° Compteur Électricité (optionnel)"
              placeholder="ex: CIE-00912"
              value={unitForm.electricity_meter_number}
              onChange={(e) => setUnitForm({ ...unitForm, electricity_meter_number: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUnitModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createUnitMutation.isPending}>
              Enregistrer le lot
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
