import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Printer,
  XCircle,
  Building2,
  User,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { billingService } from '@/services/billing/billingService';
import { InvoiceStatus } from '@/types';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-detail', id],
    queryFn: () => billingService.getInvoiceDetail(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingService.cancelInvoice(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
      setIsCancelModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'annulation de l'avis d'échéance.");
    },
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald">Soldé / Intégralement Payé</Badge>;
      case 'PARTIAL':
        return <Badge variant="blue">Paiement Partiel Reçu</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose">En Retard / Impayé</Badge>;
      case 'UNPAID':
        return <Badge variant="amber">Non Payé (En attente)</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate">Avis Annulé</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement de l'avis d'échéance...</div>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer title="Facture introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Cet avis d'échéance n'existe pas ou a été archivé.</p>
          <Button size="sm" onClick={() => navigate('/billing')}>Retour au journal de facturation</Button>
        </div>
      </PageContainer>
    );
  }

  const paid = parseFloat(invoice.total_paid || '0');
  const expected = parseFloat(invoice.total_expected || '1');
  const pct = Math.min(Math.round((paid / expected) * 100), 100);

  return (
    <PageContainer
      title={invoice.invoice_number}
      description={`Avis d'échéance de loyer • ${invoice.tenant_name} (${invoice.property_name} - Lot ${invoice.unit_number})`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/billing')}>
            Retour
          </Button>

          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Imprimer l'avis
          </Button>

          {invoice.status !== 'CANCELLED' && paid === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => setIsCancelModalOpen(true)}
            >
              Annuler l'avis
            </Button>
          )}
        </div>
      }
    >
      {errorMessage && (
        <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border border-slate-200 shadow-sm print:border-none print:shadow-none">
          <CardHeader className="border-b border-slate-100 pb-6 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase block">
                Avis d'Échéance de Loyer
              </span>
              <h2 className="text-2xl font-bold font-['Outfit'] text-slate-900 mt-0.5">
                {invoice.invoice_number}
              </h2>
              <span className="text-xs text-slate-400 block mt-1">
                Émis le {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div>{getStatusBadge(invoice.status)}</div>
          </CardHeader>

          <CardBody className="p-8 space-y-8">
            {/* Landlord & Tenant Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                  Bailleur & Immeuble
                </span>
                <h4 className="text-sm font-bold text-slate-900">{invoice.property_name}</h4>
                <p className="text-slate-600">Lot N° {invoice.unit_number}</p>
                <p className="text-slate-500">{invoice.property_city}</p>
                <div className="pt-2">
                  <span className="font-mono text-slate-500">Bail : {invoice.lease_number}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl space-y-2 border border-blue-100">
                <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px] block">
                  Locataire Titulaire
                </span>
                <h4 className="text-sm font-bold text-slate-900">{invoice.tenant_name}</h4>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{invoice.tenant_phone}</span>
                </div>
                <p className="text-slate-500">Occupant en titre</p>
              </div>
            </div>

            {/* Period & Due Date Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Période d'occupation</span>
                <span className="font-bold text-sm">
                  Du {invoice.period_start} au {invoice.period_end}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Date limite d'exigibilité</span>
                <span className="font-bold text-emerald-400 text-sm">{invoice.due_date}</span>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Décomposition des Montants Exigibles
              </h3>
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Désignation</th>
                    <th className="px-4 py-3 text-right">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      Loyer d'habitation principal (net hors charges)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{invoice.rent_amount} FCFA</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      Provisions pour charges locatives & entretien
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{invoice.charges_amount} FCFA</td>
                  </tr>
                  <tr className="bg-slate-50/80 font-bold">
                    <td className="px-4 py-3.5 text-slate-900 text-sm">Montant Total Exigible</td>
                    <td className="px-4 py-3.5 text-right text-blue-700 text-sm">{invoice.total_expected} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Settlement Status Card */}
            <div className="p-6 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Montant Réglé à ce jour</span>
                  <span className="font-bold text-emerald-600 text-lg">{invoice.total_paid} FCFA</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-slate-500 block mb-1">Solde Restant Dû</span>
                  <span className="font-bold text-rose-600 text-lg">{invoice.remaining_balance} FCFA</span>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Progression du règlement</span>
                  <span className="font-bold">{pct}% réglé</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Payments History Allocations */}
            {invoice.payments_allocations && invoice.payments_allocations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Historique des Règlements Imputés
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-100 rounded-xl">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5">Réf. Reçu</th>
                        <th className="px-4 py-2.5">Date d'encaissement</th>
                        <th className="px-4 py-2.5">Moyen de règlement</th>
                        <th className="px-4 py-2.5 text-right">Montant Alloué</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.payments_allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="px-4 py-2.5 font-mono font-bold text-blue-600">{alloc.payment_number}</td>
                          <td className="px-4 py-2.5 text-slate-600">{alloc.payment_date}</td>
                          <td className="px-4 py-2.5 text-slate-600">{alloc.payment_method}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{alloc.allocated_amount} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="p-4 bg-slate-100/70 rounded-xl text-xs text-slate-600 italic">
                <span className="font-bold not-italic block mb-1">Remarques :</span>
                {invoice.notes}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal Annulation */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Annuler l'avis d'échéance"
        description={`Confirmez l'annulation de la facture ${invoice.invoice_number}. Cette action est irréversible.`}
      >
        <div className="space-y-4">
          <Input
            label="Motif d'annulation"
            placeholder="ex: Erreur sur le montant du loyer / Avenant au bail"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Retour
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
              onClick={() => cancelMutation.mutate()}
              isLoading={cancelMutation.isPending}
            >
              Confirmer l'annulation
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};
