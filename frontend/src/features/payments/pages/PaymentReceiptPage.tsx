import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck2,
  ArrowLeft,
  Printer,
  XCircle,
  Building2,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { paymentService } from '@/services/payments/paymentService';

export const PaymentReceiptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['payment-receipt', id],
    queryFn: () => paymentService.getPaymentReceipt(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => paymentService.cancelPayment(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
      setIsCancelModalOpen(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'annulation du paiement.");
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <PageContainer title="Chargement de la quittance..." description="">
        <div className="py-16 text-center text-xs text-slate-400 font-medium">Chargement de la quittance de loyer...</div>
      </PageContainer>
    );
  }

  if (!receipt) {
    return (
      <PageContainer title="Quittance introuvable" description="">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-4">Cette quittance n'existe pas ou a été archivée.</p>
          <Button size="sm" onClick={() => navigate('/payments')}>Retour aux paiements</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={receipt.receipt_number}
      description={`Quittance officielle de loyer • ${receipt.tenant.full_name} (${receipt.amount} FCFA)`}
      action={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/payments')}>
            Retour
          </Button>

          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Imprimer la quittance
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            leftIcon={<XCircle className="w-4 h-4" />}
            onClick={() => setIsCancelModalOpen(true)}
          >
            Annuler le paiement
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

      {/* Printable Quittance Sheet */}
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border border-slate-200 shadow-sm print:border-none print:shadow-none">
          <CardHeader className="border-b border-slate-100 pb-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase block">
                  Document Officiel
                </span>
                <h2 className="text-xl font-bold font-['Outfit'] text-slate-900">
                  QUITTANCE DE LOYER
                </h2>
                <span className="font-mono text-xs text-blue-600 block mt-0.5">
                  N° {receipt.receipt_number}
                </span>
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block">Date d'émission</span>
              <span className="font-bold text-slate-900">{receipt.payment_date}</span>
            </div>
          </CardHeader>

          <CardBody className="p-4 sm:p-8 space-y-6 sm:space-y-8 text-xs">
            {/* Landlord & Tenant Two Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">
                  Bailleur / Gestionnaire
                </span>
                <h4 className="text-sm font-bold text-slate-900">{receipt.landlord.name}</h4>
                <p className="text-slate-600">{receipt.landlord.email}</p>
                {receipt.landlord.phone && <p className="text-slate-500">{receipt.landlord.phone}</p>}
              </div>

              <div className="p-4 bg-blue-50/50 rounded-2xl space-y-1.5 border border-blue-100">
                <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px] block">
                  Locataire
                </span>
                <h4 className="text-sm font-bold text-slate-900">{receipt.tenant.full_name}</h4>
                <p className="text-slate-600">{receipt.tenant.phone}</p>
                {receipt.tenant.email && <p className="text-slate-500">{receipt.tenant.email}</p>}
              </div>
            </div>

            {/* Official Certification Statement */}
            <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-slate-800 leading-relaxed">
              <p>
                Je soussigné(e) <strong>{receipt.landlord.name}</strong>, bailleur / gestionnaire de biens immobiliers, certifie avoir reçu de Monsieur / Madame / Société <strong>{receipt.tenant.full_name}</strong> la somme de :
              </p>
              <div className="my-3 p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-lg sm:text-xl font-bold text-emerald-700 font-['Outfit']">
                  {receipt.amount} FCFA
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Règlement reçu par {receipt.payment_method} {receipt.reference_number ? `(Réf: ${receipt.reference_number})` : ''}
                </span>
              </div>
              <p>
                au titre du paiement du loyer et des provisions pour charges locatives pour les périodes et lots désignés ci-après, sous réserve de tous droits et actions.
              </p>
            </div>

            {/* Covered Periods & Invoices Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Détail des Périodes & Factures Couvertes
              </h3>
              <div className="w-full overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 whitespace-nowrap">Réf. Facture</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Bien & Logement</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Période d'occupation</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Montant Alloué</th>
                      <th className="px-4 py-2.5 text-right whitespace-nowrap">Solde Restant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipt.allocations.map((alloc, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-mono font-semibold text-blue-600 whitespace-nowrap">{alloc.invoice_number}</td>
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                          {alloc.property_name} - <span className="font-mono">Lot {alloc.unit_number}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          Du {alloc.period_start} au {alloc.period_end}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {alloc.allocated_amount} FCFA
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium whitespace-nowrap">
                          {alloc.remaining_balance} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signature & Disclaimer Block */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-end">
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>Cette quittance annule tous les reçus qui auraient pu être donnés pour la même période.</p>
                <p className="font-mono text-[10px]">Identifiant système : {receipt.payment_number}</p>
              </div>

              <div className="sm:text-right space-y-4 sm:space-y-8">
                <span className="font-semibold text-slate-700 block">Pour le Bailleur / Signature & Cachet :</span>
                <div className="h-12 border-b border-dashed border-slate-300 inline-block w-48" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal Annulation Paiement */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Annuler le paiement et révoquer la quittance"
        description={`Confirmez l'annulation du paiement ${receipt.payment_number}. Les allocations sur factures seront supprimées et les dettes restaurées.`}
      >
        <div className="space-y-4">
          <Input
            label="Motif d'annulation"
            placeholder="ex: Chèque sans provision / Annulation de virement"
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
