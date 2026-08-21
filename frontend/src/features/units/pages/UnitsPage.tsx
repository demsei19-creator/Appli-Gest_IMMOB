import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DoorOpen,
  Plus,
  Search,
  Building2,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { propertyService, UnitCreatePayload } from '@/services/properties/propertyService';
import { UnitStatus, UnitType } from '@/types';

export const UnitsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [unitForm, setUnitForm] = useState<UnitCreatePayload>({
    property: '',
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

  // Query properties for dropdown
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Query units
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units', { search, status: statusFilter, unit_type: unitTypeFilter, property: propertyFilter }],
    queryFn: () =>
      propertyService.getUnits({
        search: search || undefined,
        status: statusFilter || undefined,
        unit_type: unitTypeFilter || undefined,
        property: propertyFilter || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: UnitCreatePayload) => propertyService.createUnit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      setIsCreateModalOpen(false);
      setUnitForm({
        property: '',
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
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement du logement.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.property) {
      setErrorMessage("Veuillez sélectionner un immeuble de rattachement.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(unitForm);
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

  return (
    <PageContainer
      title="Catalogue des Logements & Lots"
      description="Vue d'ensemble de l'ensemble de vos lots locatifs, état d'occupation et caractéristiques techniques."
      action={
        <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateModalOpen(true)}>
          Ajouter un Logement
        </Button>
      }
    >
      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Input
          placeholder="Rechercher lot, immeuble..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les immeubles' },
            ...properties.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'VACANT', label: 'Disponibles (Libres)' },
            { value: 'OCCUPIED', label: 'Occupés' },
            { value: 'MAINTENANCE', label: 'En travaux' },
            { value: 'RESERVED', label: 'Réservés' },
          ]}
        />

        <Select
          value={unitTypeFilter}
          onChange={(e) => setUnitTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les types' },
            { value: 'STUDIO', label: 'Studio' },
            { value: 'T1', label: 'T1' },
            { value: 'T2', label: 'T2' },
            { value: 'T3', label: 'T3' },
            { value: 'T4', label: 'T4' },
            { value: 'T5_PLUS', label: 'T5+' },
            { value: 'VILLA', label: 'Villa' },
            { value: 'COMMERCIAL', label: 'Commerce' },
            { value: 'OFFICE', label: 'Bureau' },
            { value: 'PARKING', label: 'Parking' },
          ]}
        />
      </div>

      {/* Units Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des lots...</div>
          ) : units.length === 0 ? (
            <div className="text-center py-16">
              <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun lot trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Aucun lot ne correspond à vos critères de recherche ou aucun logement n'a encore été créé.
              </p>
              <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                Ajouter un logement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Numéro / Lot</th>
                    <th className="px-6 py-3">Immeuble</th>
                    <th className="px-6 py-3">Typologie</th>
                    <th className="px-6 py-3">Étage / Pièces</th>
                    <th className="px-6 py-3">Surface</th>
                    <th className="px-6 py-3">Loyer Total</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                        {unit.unit_number}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">{unit.property_name}</span>
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
                          Fiche
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

      {/* Modal Créer Logement */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Ajouter un Logement / Lot"
        description="Renseignez les détails du logement et assignez-le à un ensemble immobilier."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Select
            label="Immeuble / Propriété de rattachement"
            required
            value={unitForm.property}
            onChange={(e) => setUnitForm({ ...unitForm, property: e.target.value })}
            options={[
              { value: '', label: '-- Sélectionner un immeuble --' },
              ...properties.map((p) => ({ value: p.id, label: `${p.name} (${p.city})` })),
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Numéro / Référence lot"
              required
              placeholder="ex: Appart B04"
              value={unitForm.unit_number}
              onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
            />
            <Input
              label="Étage"
              placeholder="ex: 1er étage"
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
                { value: 'COMMERCIAL', label: 'Local Commercial' },
                { value: 'OFFICE', label: 'Bureau' },
                { value: 'PARKING', label: 'Parking' },
              ]}
            />
            <Input
              label="Surface habitable (m²)"
              type="number"
              placeholder="ex: 60"
              value={unitForm.surface_area_sqm}
              onChange={(e) => setUnitForm({ ...unitForm, surface_area_sqm: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Loyer de base hors charges (FCFA)"
              required
              type="number"
              placeholder="ex: 200000"
              value={unitForm.base_rent_amount}
              onChange={(e) => setUnitForm({ ...unitForm, base_rent_amount: e.target.value })}
            />
            <Input
              label="Provisions pour charges (FCFA)"
              type="number"
              placeholder="ex: 15000"
              value={unitForm.service_charges_amount}
              onChange={(e) => setUnitForm({ ...unitForm, service_charges_amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="N° Compteur Eau (optionnel)"
              placeholder="ex: SODECI-4491"
              value={unitForm.water_meter_number}
              onChange={(e) => setUnitForm({ ...unitForm, water_meter_number: e.target.value })}
            />
            <Input
              label="N° Compteur Électricité (optionnel)"
              placeholder="ex: CIE-3312"
              value={unitForm.electricity_meter_number}
              onChange={(e) => setUnitForm({ ...unitForm, electricity_meter_number: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Enregistrer le logement
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
