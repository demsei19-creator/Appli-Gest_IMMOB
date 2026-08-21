import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Home,
  ShieldAlert,
  Plus,
  FileText,
  CreditCard,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { tenantService } from '@/services/tenants/tenantService';

export const TenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-detail', id],
    queryFn: () => tenantService.getTenantDetail(id!),
    enabled: !!id,
  });

  const addContactMutation = useMutation({
    mutationFn: () =>
      tenantService.addEmergencyContact(id!, {
        name: contactName,
        relationship: contactRelation,
        phone_number: contactPhone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-detail', id] });
      setIsContactModalOpen(false);
      setContactName('');
      setContactRelation('');
      setContactPhone('');
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'ajout du contact.");
    },
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    addContactMutation.mutate();
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement du dossier locataire...</div>
      </PageContainer>
    );
  }

  if (!tenant) {
    return (
      <PageContainer title="Locataire introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Ce dossier locataire n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/tenants')}>Retour au répertoire</Button>
        </div>
      </PageContainer>
    );
  }

  const hasUnpaid = parseFloat(tenant.total_unpaid_balance || '0') > 0;

  return (
    <PageContainer
      title={tenant.full_name}
      description={`${tenant.tenant_type === 'COMPANY' ? 'Entreprise / Personne Morale' : 'Particulier'} • ${tenant.phone_number}`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/tenants')}>
            Retour aux locataires
          </Button>
          <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsContactModalOpen(true)}>
            Ajouter contact d'urgence
          </Button>
        </div>
      }
    >
      {/* 360° Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Accommodation, Financial Solde & Lease History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Lease & Accommodation Banner */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logement Actuellement Occupé</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Bail en cours d'exécution et conditions locatives.</p>
              </div>
              {tenant.is_active_occupant ? (
                <Badge variant="emerald">Occupant Actif</Badge>
              ) : (
                <Badge variant="slate">Sans Bail Actif</Badge>
              )}
            </CardHeader>
            <CardBody>
              {tenant.active_lease ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                        <Home className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">
                          {tenant.active_lease.property_name} - Lot {tenant.active_lease.unit_number}
                        </h4>
                        <span className="text-xs text-slate-500">{tenant.active_lease.unit_type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Loyer Mensuel</span>
                      <span className="text-lg font-bold text-blue-700 font-['Outfit']">
                        {tenant.active_lease.total_monthly_amount} FCFA
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Date d'entrée</span>
                      <span className="font-semibold text-slate-900">{tenant.active_lease.start_date}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Échéance mensuelle</span>
                      <span className="font-semibold text-slate-900">Le {tenant.active_lease.payment_day_of_month} du mois</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Dépôt de garantie</span>
                      <span className="font-semibold text-slate-900">{tenant.active_lease.deposit_amount} FCFA</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Provisions charges</span>
                      <span className="font-semibold text-slate-900">{tenant.active_lease.charges_amount} FCFA</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  <Home className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span>Ce locataire n'occupe actuellement aucun logement. Vous pouvez lui créer un nouveau bail.</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Past Leases History */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des Locations & Baux Passés</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {(!tenant.lease_history || tenant.lease_history.length === 0) ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  <span>Aucun historique de bail antérieur enregistré.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Bien / Lot</th>
                        <th className="px-6 py-3">Période</th>
                        <th className="px-6 py-3">Loyer</th>
                        <th className="px-6 py-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenant.lease_history.map((lh) => (
                        <tr key={lh.id}>
                          <td className="px-6 py-3 font-semibold text-slate-900">
                            {lh.property_name} - Lot {lh.unit_number}
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {lh.start_date} → {lh.end_date || 'N/A'}
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-900">
                            {lh.total_monthly_amount} FCFA
                          </td>
                          <td className="px-6 py-3">
                            <Badge variant="slate">{lh.status_display || lh.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Tenant Identity, Solde & Emergency Contacts */}
        <div className="space-y-6">
          {/* Solde & Arrears Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Situation Comptable</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className={`p-4 rounded-2xl flex items-center justify-between ${
                hasUnpaid ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <span className="text-xs font-semibold block uppercase tracking-wider">
                    {hasUnpaid ? 'Arriérés de Loyer' : 'Solde Locatif'}
                  </span>
                  <span className="text-xl font-bold font-['Outfit'] mt-0.5 block">
                    {tenant.total_unpaid_balance} FCFA
                  </span>
                </div>
                {hasUnpaid ? (
                  <ShieldAlert className="w-7 h-7 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                )}
              </div>
            </CardBody>
          </Card>

          {/* Identity & Solvency Details */}
          <Card>
            <CardHeader>
              <CardTitle>Profil & Pièces d'Identité</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Téléphone principal</span>
                <span className="font-semibold text-slate-900">{tenant.phone_number}</span>
              </div>
              {tenant.secondary_phone && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Téléphone secondaire</span>
                  <span className="font-semibold text-slate-900">{tenant.secondary_phone}</span>
                </div>
              )}
              {tenant.email && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Email</span>
                  <span className="font-semibold text-slate-900">{tenant.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">{tenant.id_card_type || 'Pièce ID'}</span>
                <span className="font-mono font-semibold text-slate-900">{tenant.id_card_number || '-'}</span>
              </div>
              {tenant.tax_id && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">N° Contribuable / NIF</span>
                  <span className="font-mono font-semibold text-slate-900">{tenant.tax_id}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Profession / Activité</span>
                <span className="font-semibold text-slate-900">{tenant.profession || '-'}</span>
              </div>
              {tenant.monthly_income && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Revenu mensuel déclaré</span>
                  <span className="font-bold text-slate-900">{tenant.monthly_income} FCFA</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Emergency Contacts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts d'Urgence ({tenant.emergency_contacts?.length || 0})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setIsContactModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardBody className="space-y-3">
              {(!tenant.emergency_contacts || tenant.emergency_contacts.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-3">Aucun contact d'urgence renseigné.</p>
              ) : (
                tenant.emergency_contacts.map((contact) => (
                  <div key={contact.id} className="p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{contact.name}</span>
                      <span className="text-slate-400 text-[11px]">{contact.relationship || 'Proche'}</span>
                    </div>
                    <span className="font-semibold text-blue-600 font-mono">{contact.phone_number}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal Ajout Contact d'Urgence */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Ajouter un contact d'urgence"
        description={`Ajouter une personne à contacter en cas d'urgence pour ${tenant.full_name}.`}
      >
        <form onSubmit={handleContactSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Input
            label="Nom complet du contact"
            required
            placeholder="ex: Drissa Traoré"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lien de parenté / Relation"
              placeholder="ex: Frère, Conjoint, Associé"
              value={contactRelation}
              onChange={(e) => setContactRelation(e.target.value)}
            />
            <Input
              label="Numéro de téléphone"
              required
              placeholder="ex: +225 01 02 03 04"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsContactModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={addContactMutation.isPending}>
              Ajouter le contact
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
