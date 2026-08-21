import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Home,
  ArrowUpRight,
  AlertCircle,
  Building,
  UserCheck,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { tenantService, TenantCreatePayload } from '@/services/tenants/tenantService';
import { TenantType, IdCardType } from '@/types';

export const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState('');
  const [tenantTypeFilter, setTenantTypeFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<TenantCreatePayload>({
    tenant_type: 'INDIVIDUAL',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone_number: '',
    secondary_phone: '',
    id_card_type: 'CNI',
    id_card_number: '',
    tax_id: '',
    profession: '',
    employer: '',
    monthly_income: '',
    city: 'Abidjan',
    notes: '',
  });

  const isActiveOccupantParam =
    occupancyFilter === 'active' ? true : occupancyFilter === 'former' ? false : undefined;

  // Query tenants list
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants', { search, occupancyFilter, tenant_type: tenantTypeFilter }],
    queryFn: () =>
      tenantService.getTenants({
        search: search || undefined,
        is_active_occupant: isActiveOccupantParam,
        tenant_type: tenantTypeFilter || undefined,
      }),
  });

  // Query tenant stats
  const { data: stats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: () => tenantService.getTenantStats(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: TenantCreatePayload) => tenantService.createTenant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats'] });
      setIsModalOpen(false);
      setFormData({
        tenant_type: 'INDIVIDUAL',
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone_number: '',
        secondary_phone: '',
        id_card_type: 'CNI',
        id_card_number: '',
        tax_id: '',
        profession: '',
        employer: '',
        monthly_income: '',
        city: 'Abidjan',
        notes: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la création du dossier locataire.');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  return (
    <PageContainer
      title="Répertoire des Locataires"
      description="Gestion des dossiers locataires, personnes physiques ou morales, suivi des baux et solvabilité."
      action={
        <Button size="md" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Nouveau Locataire
        </Button>
      }
    >
      {/* KPI Stats Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Dossiers</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
                {stats.total_tenants} locataires
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Locataires en Place</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block">
                {stats.active_occupants_count} actifs
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Anciens Locataires</span>
              <span className="text-2xl font-bold text-slate-500 font-['Outfit'] mt-1 block">
                {stats.former_tenants_count} archivés
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Arriérés / Impayés Cumulés</span>
              <span className="text-xl font-bold text-rose-600 font-['Outfit'] mt-1 block truncate">
                {stats.total_unpaid_balance} FCFA
              </span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Input
          placeholder="Rechercher par nom, email, téléphone, CNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={occupancyFilter}
          onChange={(e) => setOccupancyFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les locataires' },
            { value: 'active', label: 'Locataires Actifs (Bail en cours)' },
            { value: 'former', label: 'Anciens Locataires (Sans bail actif)' },
          ]}
        />

        <Select
          value={tenantTypeFilter}
          onChange={(e) => setTenantTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les types (Particuliers & Sociétés)' },
            { value: 'INDIVIDUAL', label: 'Particuliers uniquement' },
            { value: 'COMPANY', label: 'Entreprises / Sociétés' },
          ]}
        />
      </div>

      {/* Tenants Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des locataires...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun dossier locataire trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Enregistrez vos locataires pour pouvoir leur associer des baux et générer leurs avis d'échéance.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Ajouter un locataire
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Locataire / Entité</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Coordonnées</th>
                    <th className="px-6 py-3">Logement Actuel</th>
                    <th className="px-6 py-3">Statut Bail</th>
                    <th className="px-6 py-3">Solde Impayé</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((t) => {
                    const hasUnpaid = parseFloat(t.total_unpaid_balance || '0') > 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-['Outfit'] shrink-0">
                              {t.full_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{t.full_name}</span>
                              {t.id_card_number && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {t.id_card_type || 'ID'}: {t.id_card_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={t.tenant_type === 'COMPANY' ? 'blue' : 'slate'}>
                            {t.tenant_type_display || (t.tenant_type === 'COMPANY' ? 'Société' : 'Particulier')}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{t.phone_number}</span>
                            </div>
                            {t.email && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[140px]">{t.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {t.active_lease_summary ? (
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {t.active_lease_summary.property_name}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                Lot {t.active_lease_summary.unit_number} ({t.active_lease_summary.monthly_amount} FCFA)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Aucun lot en cours</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {t.is_active_occupant ? (
                            <Badge variant="emerald">Occupant Actif</Badge>
                          ) : (
                            <Badge variant="slate">Sans Bail Actif</Badge>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {hasUnpaid ? (
                            <Badge variant="rose">{t.total_unpaid_balance} FCFA</Badge>
                          ) : (
                            <Badge variant="emerald">À jour (0 FCFA)</Badge>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/tenants/${t.id}`)}
                          >
                            Dossier 360°
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

      {/* Modal Nouveau Locataire */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer un Dossier Locataire"
        description="Renseignez les informations d'identification et de solvabilité du locataire."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                formData.tenant_type === 'INDIVIDUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setFormData({ ...formData, tenant_type: 'INDIVIDUAL' })}
            >
              Particulier / Personne Physique
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                formData.tenant_type === 'COMPANY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setFormData({ ...formData, tenant_type: 'COMPANY' })}
            >
              Société / Personne Morale
            </button>
          </div>

          {formData.tenant_type === 'INDIVIDUAL' ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                required
                placeholder="ex: Mamadou"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Nom de famille"
                required
                placeholder="ex: Koné"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          ) : (
            <Input
              label="Raison Sociale / Nom Entreprise"
              required
              placeholder="ex: Cabinet Médical Abidjan SARL"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Numéro de téléphone principal"
              required
              placeholder="ex: +225 07 00 00 00"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
            <Input
              label="Adresse Email"
              type="email"
              placeholder="ex: locataire@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type de pièce d'identité"
              value={formData.id_card_type}
              onChange={(e) => setFormData({ ...formData, id_card_type: e.target.value as IdCardType })}
              options={[
                { value: 'CNI', label: "Carte Nationale d'Identité" },
                { value: 'PASSPORT', label: 'Passeport' },
                { value: 'RESIDENCE_PERMIT', label: 'Titre de Séjour' },
                { value: 'RCCM', label: 'RCCM (Registre du Commerce)' },
                { value: 'OTHER', label: 'Autre' },
              ]}
            />
            <Input
              label="Numéro de pièce / RCCM"
              placeholder="ex: C001928192"
              value={formData.id_card_number}
              onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Profession / Activité"
              placeholder="ex: Cadre Bancaire"
              value={formData.profession}
              onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            />
            <Input
              label="Revenu mensuel net (FCFA)"
              type="number"
              placeholder="ex: 750000"
              value={formData.monthly_income}
              onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Créer le dossier locataire
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
