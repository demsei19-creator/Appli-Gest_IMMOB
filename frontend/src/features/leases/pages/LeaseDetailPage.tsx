import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Home,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
  XCircle,
  Calendar,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { leaseService, DepositActionPayload } from '@/services/leases/leaseService';
import { LeaseStatus, DepositStatus } from '@/types';

export const LeaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Termination modal state
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [terminationReason, setTerminationReason] = useState('');
  const [nextUnitStatus, setNextUnitStatus] = useState<'VACANT' | 'MAINTENANCE'>('VACANT');

  // Deposit modal state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAction, setDepositAction] = useState<'PAY' | 'REFUND' | 'RETAIN'>('PAY');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Virement Bancaire');
  const [receiptRef, setReceiptRef] = useState('');
  const [depositReason, setDepositReason] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease-detail', id],
    queryFn: () => leaseService.getLeaseDetail(id!),
    enabled: !!id,
  });

  const activateMutation = useMutation({
    mutationFn: () => leaseService.activateLease(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'activation du bail.");
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () =>
      leaseService.terminateLease(id!, {
        termination_date: terminationDate,
        reason: terminationReason,
        next_unit_status: nextUnitStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsTerminateModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la résiliation du bail.');
    },
  });

  const depositMutation = useMutation({
    mutationFn: () =>
      leaseService.manageDeposit(id!, {
        action: depositAction,
        amount: depositAmount ? parseFloat(depositAmount) : undefined,
        payment_method: paymentMethod,
        receipt_reference: receiptRef,
        reason: depositReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease-stats'] });
      setIsDepositModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la gestion de la caution.');
    },
  });

  const getStatusBadge = (status: LeaseStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="emerald">Bail Actif</Badge>;
      case 'DRAFT':
        return <Badge variant="blue">Brouillon</Badge>;
      case 'TERMINATED':
        return <Badge variant="slate">Résilié / Sortie</Badge>;
      case 'EXPIRED':
        return <Badge variant="amber">Expiré</Badge>;
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
        return <Badge variant="amber">En Attente d'Encaissement</Badge>;
      case 'REFUNDED':
        return <Badge variant="slate">Totalement Restituée</Badge>;
      case 'PARTIALLY_REFUNDED':
        return <Badge variant="slate">Partiellement Restituée</Badge>;
      case 'RETAINED':
        return <Badge variant="rose">Retenue pour Dégradations</Badge>;
      default:
        return <Badge variant="slate">{deposit.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement du contrat de bail...</div>
      </PageContainer>
    );
  }

  if (!lease) {
    return (
      <PageContainer title="Contrat introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Ce contrat de bail n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/leases')}>Retour aux baux</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={lease.lease_number}
      description={`Contrat de location • ${lease.tenant_name} (${lease.property_name} - Lot ${lease.unit_number})`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/leases')}>
            Retour aux baux
          </Button>

          {lease.status === 'DRAFT' && (
            <Button size="sm" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => activateMutation.mutate()} isLoading={activateMutation.isPending}>
              Activer le bail
            </Button>
          )}

          {lease.status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => setIsTerminateModalOpen(true)}
            >
              Résilier le bail
            </Button>
          )}
        </div>
      }
    >
      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Contract Terms & Termination banner */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Conditions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Conditions Financières & Exigibilité</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Paramètres du loyer mensuel et périodicité.</p>
              </div>
              {getStatusBadge(lease.status)}
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Loyer hors charges</span>
                  <span className="font-bold text-slate-900 text-sm">{lease.rent_amount} FCFA</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Provisions charges</span>
                  <span className="font-bold text-slate-900 text-sm">{lease.charges_amount} FCFA</span>
                </div>
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <span className="text-blue-900 block mb-1 font-semibold">Loyer Total Mensuel</span>
                  <span className="font-bold text-blue-700 text-base">{lease.total_monthly_amount} FCFA</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-1">Échéance mensuelle</span>
                  <span className="font-bold text-slate-900 text-sm">Le {lease.payment_day_of_month} du mois</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs border-t border-slate-100 pt-4">
                <div>
                  <span className="text-slate-400 block">Date de prise d'effet</span>
                  <span className="font-semibold text-slate-900">{lease.start_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date de fin</span>
                  <span className="font-semibold text-slate-900">{lease.end_date || 'Durée indéterminée'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Périodicité</span>
                  <span className="font-semibold text-slate-900">{lease.payment_frequency_display || lease.payment_frequency}</span>
                </div>
              </div>

              {lease.status === 'TERMINATED' && (
                <div className="p-4 bg-slate-100/80 rounded-2xl text-xs space-y-1 border border-slate-200">
                  <span className="font-bold text-slate-800 block">Bail Résilié le {lease.termination_date}</span>
                  {lease.termination_reason && (
                    <p className="text-slate-600 italic">Motif : {lease.termination_reason}</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Deposit & Caution Management Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dépôt de Garantie (Caution)</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Suivi de l'encaissement et de la restitution.</p>
              </div>
              {getDepositBadge(lease.deposit)}
            </CardHeader>
            <CardBody className="space-y-4">
              {lease.deposit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Montant exigé</span>
                      <span className="font-bold text-slate-900 text-sm">{lease.deposit.amount} FCFA</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Date encaissement</span>
                      <span className="font-semibold text-slate-900">{lease.deposit.received_date || 'Non encaissé'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-1">Moyen / Référence</span>
                      <span className="font-semibold text-slate-900">{lease.deposit.payment_method || '-'}</span>
                    </div>
                  </div>

                  {(lease.deposit.status === 'REFUNDED' || lease.deposit.status === 'PARTIALLY_REFUNDED' || lease.deposit.status === 'RETAINED') && (
                    <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Montant Restitué :</span>
                        <span className="font-bold text-emerald-700">{lease.deposit.refunded_amount} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Montant Retenu :</span>
                        <span className="font-bold text-rose-700">{lease.deposit.deduction_amount} FCFA</span>
                      </div>
                      {lease.deposit.deduction_reason && (
                        <p className="text-slate-500 pt-1 italic">Motif retenue : {lease.deposit.deduction_reason}</p>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<ShieldCheck className="w-4 h-4" />}
                      onClick={() => {
                        setDepositAmount(lease.deposit?.amount || '');
                        setIsDepositModalOpen(true);
                      }}
                    >
                      Mettre à jour la caution
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">Aucune caution rattachée.</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Tenant & Accommodation Info */}
        <div className="space-y-6">
          {/* Tenant Card */}
          <Card>
            <CardHeader>
              <CardTitle>Locataire Titulaire</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-['Outfit']">
                  {lease.tenant_name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{lease.tenant_name}</h4>
                  <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{lease.tenant_phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/tenants/${lease.tenant}`)}
                >
                  Voir le dossier locataire 360°
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Rented Accommodation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Logement Rattaché</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{lease.property_name}</h4>
                  <span className="text-slate-500 font-mono">Lot {lease.unit_number}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/units/${lease.unit}`)}
                >
                  Voir la fiche du logement
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal Résilier Bail */}
      <Modal
        isOpen={isTerminateModalOpen}
        onClose={() => setIsTerminateModalOpen(false)}
        title="Résilier le contrat de bail"
        description={`Confirmez la sortie du locataire ${lease.tenant_name} et la libération du lot ${lease.unit_number}.`}
      >
        <div className="space-y-4">
          <Input
            label="Date effective de sortie"
            type="date"
            required
            value={terminationDate}
            onChange={(e) => setTerminationDate(e.target.value)}
          />

          <Input
            label="Motif de résiliation / sortie"
            placeholder="ex: Fin de préavis de départ / Déménagement"
            value={terminationReason}
            onChange={(e) => setTerminationReason(e.target.value)}
          />

          <Select
            label="Statut du logement après sortie"
            value={nextUnitStatus}
            onChange={(e) => setNextUnitStatus(e.target.value as any)}
            options={[
              { value: 'VACANT', label: 'Disponible immédiatement pour location' },
              { value: 'MAINTENANCE', label: 'En travaux / Rénovation avant remise en location' },
            ]}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsTerminateModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
              onClick={() => terminateMutation.mutate()}
              isLoading={terminateMutation.isPending}
            >
              Confirmer la résiliation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Gérer Caution */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title="Gestion de la Caution / Dépôt de Garantie"
        description="Enregistrez l'encaissement, la restitution ou la retenue sur caution."
      >
        <div className="space-y-4">
          <Select
            label="Action sur la caution"
            value={depositAction}
            onChange={(e) => setDepositAction(e.target.value as any)}
            options={[
              { value: 'PAY', label: "Encaisser la caution (Paiement reçu du locataire)" },
              { value: 'REFUND', label: 'Restituer la caution (Sortie des lieux conforme)' },
              { value: 'RETAIN', label: 'Retenir sur caution (Dégradations ou impayés)' },
            ]}
          />

          <Input
            label="Montant de l'opération (FCFA)"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />

          {depositAction === 'PAY' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Moyen de paiement"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'Virement Bancaire', label: 'Virement Bancaire' },
                  { value: 'Espèces', label: 'Espèces' },
                  { value: 'Chèque', label: 'Chèque' },
                  { value: 'Mobile Money', label: 'Mobile Money (Orange/Wave/MTN)' },
                ]}
              />
              <Input
                label="Référence du reçu / Transaction"
                placeholder="ex: REC-0091"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
              />
            </div>
          )}

          {depositAction !== 'PAY' && (
            <Input
              label="Motif justificatif"
              placeholder="ex: État des lieux de sortie conforme / Remplacement serrure"
              value={depositReason}
              onChange={(e) => setDepositReason(e.target.value)}
            />
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDepositModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => depositMutation.mutate()} isLoading={depositMutation.isPending}>
              Enregistrer l'opération
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};
