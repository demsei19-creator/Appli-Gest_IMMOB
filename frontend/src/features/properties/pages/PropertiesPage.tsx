import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Home,
  ArrowUpRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { propertyService, PropertyCreatePayload } from '@/services/properties/propertyService';
import { PropertyType } from '@/types';

export const PropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<PropertyCreatePayload>({
    name: '',
    code: '',
    property_type: 'BUILDING',
    address: '',
    city: 'Abidjan',
    postal_code: '',
    country: "Côte d'Ivoire",
    description: '',
    purchase_price: '',
    estimated_value: '',
  });

  // Query properties list
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', { search, property_type: propertyTypeFilter }],
    queryFn: () =>
      propertyService.getProperties({
        search: search || undefined,
        property_type: propertyTypeFilter || undefined,
      }),
  });

  // Query global portfolio stats
  const { data: stats } = useQuery({
    queryKey: ['property-stats'],
    queryFn: () => propertyService.getPropertyStats(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: PropertyCreatePayload) => propertyService.createProperty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-stats'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        code: '',
        property_type: 'BUILDING',
        address: '',
        city: 'Abidjan',
        postal_code: '',
        country: "Côte d'Ivoire",
        description: '',
        purchase_price: '',
        estimated_value: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement de l'immeuble.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  return (
    <PageContainer
      title="Immeubles & Patrimoine"
      description="Gestion des ensembles immobiliers, résidences, locaux commerciaux et suivi des taux d'occupation."
      action={
        <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Ajouter un Immeuble
        </Button>
      }
    >
      {/* Portfolio Quick KPIs */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Immeubles</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
                {stats.total_properties} ensembles
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Parc Locatif</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
                {stats.total_units} logements
              </span>
              <span className="text-xs text-emerald-600 font-medium">{stats.occupied_units} occupés • {stats.vacant_units} libres</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Taux d'Occupation</span>
              <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
                {stats.occupancy_rate_percent}%
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Potentiel Locatif Mensuel</span>
              <span className="text-xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_monthly_revenue_potential} FCFA
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Rechercher par nom, ville, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'Tous les types de biens' },
              { value: 'BUILDING', label: 'Immeubles' },
              { value: 'RESIDENCE', label: 'Résidences' },
              { value: 'COMMERCIAL', label: 'Locaux Commerciaux' },
              { value: 'VILLA', label: 'Villas' },
              { value: 'LAND', label: 'Terrains' },
            ]}
          />
        </div>
      </div>

      {/* Properties Cards Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement de votre patrimoine...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Aucun immeuble enregistré</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Commencez par ajouter votre premier immeuble ou résidence pour y configurer vos lots et logements.
          </p>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            Ajouter mon premier immeuble
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => {
            const occupancyRate = prop.occupancy_rate || 0;
            return (
              <Card key={prop.id} hoverEffect className="flex flex-col justify-between">
                <CardBody className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <Badge variant="blue">{prop.property_type_display || prop.property_type}</Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-['Outfit']">{prop.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{prop.address}, {prop.city}</span>
                    </div>
                    {prop.code && (
                      <span className="inline-block mt-1 font-mono text-[10px] text-slate-400 font-semibold">
                        RÉF : {prop.code}
                      </span>
                    )}
                  </div>

                  {/* Units stats bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Occupation ({occupancyRate}%)</span>
                      <span>{prop.occupied_units_count} / {prop.units_count} lots</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Valeur estimée</span>
                      <span className="font-semibold text-slate-900">{prop.estimated_value ? `${prop.estimated_value} FCFA` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Lots vacants</span>
                      <span className="font-semibold text-amber-600">{prop.vacant_units_count || (prop.units_count - prop.occupied_units_count)} disponible(s)</span>
                    </div>
                  </div>
                </CardBody>

                <div
                  onClick={() => navigate(`/properties/${prop.id}`)}
                  className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <span>Gérer l'immeuble et ses lots ({prop.units_count})</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Créer Immeuble */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un Immeuble / Bien Immobilier"
        description="Renseignez les détails de votre ensemble immobilier pour y associer des logements."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom de l'immeuble / résidence"
              required
              placeholder="ex: Résidence Les Palmiers"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Code référence (optionnel)"
              placeholder="ex: IMM-001 (auto si vide)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type de bien"
              value={formData.property_type}
              onChange={(e) => setFormData({ ...formData, property_type: e.target.value as PropertyType })}
              options={[
                { value: 'BUILDING', label: 'Immeuble collectif' },
                { value: 'RESIDENCE', label: 'Résidence fermée / Lotissement' },
                { value: 'COMMERCIAL', label: 'Centre commercial / Bureaux' },
                { value: 'VILLA', label: 'Villa' },
                { value: 'LAND', label: 'Terrain nu' },
              ]}
            />
            <Input
              label="Ville / Commune"
              required
              placeholder="ex: Abidjan / Cocody"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <Input
            label="Adresse physique complète"
            required
            placeholder="ex: 14 Boulevard de la République"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prix d'acquisition (FCFA)"
              type="number"
              placeholder="ex: 350000000"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            />
            <Input
              label="Valeur estimée actuelle (FCFA)"
              type="number"
              placeholder="ex: 420000000"
              value={formData.estimated_value}
              onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Créer l'immeuble
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
