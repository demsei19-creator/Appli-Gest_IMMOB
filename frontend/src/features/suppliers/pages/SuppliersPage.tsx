import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Wrench,
  DollarSign,
  AlertCircle,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { supplierService, SupplierCreatePayload } from '@/services/suppliers/supplierService';
import { SupplierCategory } from '@/types';

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<SupplierCreatePayload>({
    name: '',
    category: 'PLUMBING',
    contact_name: '',
    phone_number: '',
    email: '',
    address: '',
    tax_id: '',
    notes: '',
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', { category: categoryFilter, search }],
    queryFn: () =>
      supplierService.getSuppliers({
        category: categoryFilter || undefined,
        search: search || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: SupplierCreatePayload) => supplierService.createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        category: 'PLUMBING',
        contact_name: '',
        phone_number: '',
        email: '',
        address: '',
        tax_id: '',
        notes: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement de l'artisan.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage("Veuillez saisir le nom de l'entreprise ou de l'artisan.");
      return;
    }
    if (!formData.phone_number.trim()) {
      setErrorMessage('Veuillez saisir un numéro de téléphone de contact.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getCategoryBadge = (cat: SupplierCategory) => {
    switch (cat) {
      case 'PLUMBING':
        return <Badge variant="blue">Plomberie & Sanitaire</Badge>;
      case 'ELECTRICAL':
        return <Badge variant="amber">Électricité & Domotique</Badge>;
      case 'MASONRY':
        return <Badge variant="slate">Maçonnerie & Gros œuvre</Badge>;
      case 'PAINTING':
        return <Badge variant="purple">Peinture & Finitions</Badge>;
      case 'CLEANING':
        return <Badge variant="emerald">Nettoyage & Entretien</Badge>;
      case 'HVAC':
        return <Badge variant="blue">Climatisation & Froid</Badge>;
      case 'SECURITY':
        return <Badge variant="rose">Gardiennage & Sécurité</Badge>;
      default:
        return <Badge variant="slate">Autre spécialité</Badge>;
    }
  };

  const plumbingCount = suppliers.filter((s) => s.category === 'PLUMBING').length;
  const electricalCount = suppliers.filter((s) => s.category === 'ELECTRICAL').length;
  const otherCount = suppliers.length - (plumbingCount + electricalCount);

  return (
    <PageContainer
      title="Fournisseurs & Artisans"
      description="Annuaire des prestataires qualifiés pour les travaux, dépannages d'urgence et maintenance de votre patrimoine."
      action={
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
        >
          Ajouter un Artisan
        </Button>
      }
    >
      {/* Category Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Artisans</span>
            <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
              {suppliers.length}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">prestataires référencés</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Plomberie & Eau</span>
            <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
              {plumbingCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">artisans plombiers</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Électricité & Énergie</span>
            <span className="text-2xl font-bold text-amber-600 font-['Outfit'] mt-1 block">
              {electricalCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">électriciens qualifiés</span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Autres Métiers</span>
            <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block">
              {otherCount}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">peinture, maçonnerie, clim</span>
          </CardBody>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder="Rechercher par nom d'artisan, contact, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="sm:col-span-2"
        />

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les corps d’état' },
            { value: 'PLUMBING', label: 'Plomberie & Sanitaire' },
            { value: 'ELECTRICAL', label: 'Électricité & Domotique' },
            { value: 'MASONRY', label: 'Maçonnerie & Gros œuvre' },
            { value: 'PAINTING', label: 'Peinture & Finitions' },
            { value: 'CLEANING', label: 'Nettoyage & Entretien' },
            { value: 'HVAC', label: 'Climatisation & Froid' },
            { value: 'SECURITY', label: 'Gardiennage & Sécurité' },
            { value: 'OTHER', label: 'Autre' },
          ]}
        />
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement de l'annuaire des artisans...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun artisan ou prestataire enregistré</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Constituez votre annuaire d'artisans de confiance pour affecter rapidement vos demandes de travaux.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Ajouter un premier artisan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Entreprise / Artisan</th>
                    <th className="px-6 py-3">Spécialité</th>
                    <th className="px-6 py-3">Interlocuteur</th>
                    <th className="px-6 py-3">Téléphone</th>
                    <th className="px-6 py-3">Email & Adresse</th>
                    <th className="px-6 py-3">Interventions Réalisées</th>
                    <th className="px-6 py-3">Total Facturé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        {s.tax_id && (
                          <span className="text-[11px] font-mono text-slate-400">RCCM: {s.tax_id}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {getCategoryBadge(s.category)}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700">
                        {s.contact_name || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={`tel:${s.phone_number}`}
                          className="font-semibold text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {s.phone_number}
                        </a>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {s.email && <div className="block">{s.email}</div>}
                        {s.address && <div className="text-slate-400 text-[11px]">{s.address}</div>}
                        {!s.email && !s.address && <span className="text-slate-400">-</span>}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="slate">{s.total_interventions_count || 0} dossiers</Badge>
                      </td>

                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {s.total_spent || '0.00'} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal Ajouter Fournisseur */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un Fournisseur / Artisan"
        description="Enregistrez les coordonnées et spécialités d'un nouvel artisan dans votre carnet d'adresses."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nom de l’entreprise / Artisan"
              required
              placeholder="ex: ETS Soro Plomberie"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Select
              label="Spécialité / Corps d'état"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })}
              options={[
                { value: 'PLUMBING', label: 'Plomberie & Sanitaire' },
                { value: 'ELECTRICAL', label: 'Électricité & Domotique' },
                { value: 'MASONRY', label: 'Maçonnerie & Gros œuvre' },
                { value: 'PAINTING', label: 'Peinture & Finitions' },
                { value: 'CLEANING', label: 'Nettoyage & Entretien' },
                { value: 'HVAC', label: 'Climatisation & Froid' },
                { value: 'SECURITY', label: 'Gardiennage & Sécurité' },
                { value: 'OTHER', label: 'Autre spécialité' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Interlocuteur principal"
              placeholder="ex: M. Amara Soro"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            />

            <Input
              label="Téléphone professionnel"
              required
              placeholder="ex: +225 07 08 09 10"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email (Optionnel)"
              type="email"
              placeholder="ex: contact@soro-plomb.ci"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="N° RCCM / SIRET (Optionnel)"
              placeholder="ex: CI-ABJ-2024-B-1234"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />
          </div>

          <Input
            label="Adresse / Atelier"
            placeholder="ex: Koumassi Zone Industrielle, Rue du Canal"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Notes & Tarifs indicatifs"
            placeholder="ex: Déplacement offert, forfait recherche de fuite à 25 000 FCFA..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Enregistrer l'artisan
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
