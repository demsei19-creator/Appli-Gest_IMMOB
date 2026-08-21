import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Landmark,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck2,
  Calculator,
  Percent,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { taxService, TaxCreatePayload } from '@/services/taxes/taxService';
import { propertyService } from '@/services/properties/propertyService';
import { TaxType } from '@/types';

export const TaxesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<'schedule' | 'simulator'>('schedule');

  const [search, setSearch] = useState('');
  const [taxTypeFilter, setTaxTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [isPaidFilter, setIsPaidFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTaxId, setDeleteTaxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<TaxCreatePayload>({
    property: '',
    tax_type: 'PROPERTY_TAX',
    fiscal_year: currentYear,
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    is_paid: false,
    reference_notice: '',
    notes: '',
  });

  // Query properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Query taxes list
  const { data: taxes = [], isLoading: isTaxesLoading } = useQuery({
    queryKey: [
      'taxes',
      {
        fiscal_year: selectedYear,
        tax_type: taxTypeFilter,
        property: propertyFilter,
        is_paid: isPaidFilter,
        search,
      },
    ],
    queryFn: () =>
      taxService.getTaxes({
        fiscal_year: selectedYear || undefined,
        tax_type: taxTypeFilter || undefined,
        property: propertyFilter || undefined,
        is_paid: isPaidFilter ? isPaidFilter === 'true' : undefined,
        search: search || undefined,
      }),
  });

  // Query taxes KPIs
  const { data: stats } = useQuery({
    queryKey: ['tax-stats', { fiscal_year: selectedYear }],
    queryFn: () => taxService.getTaxStats({ fiscal_year: selectedYear }),
  });

  // Query tax simulation for year
  const { data: simulation, isLoading: isSimLoading } = useQuery({
    queryKey: ['tax-simulation', { fiscal_year: selectedYear }],
    queryFn: () => taxService.getTaxSimulation(selectedYear),
    enabled: activeTab === 'simulator',
  });

  // Create tax mutation
  const createMutation = useMutation({
    mutationFn: (payload: TaxCreatePayload) => taxService.createTax(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      queryClient.invalidateQueries({ queryKey: ['tax-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tax-simulation'] });
      setIsModalOpen(false);
      setFormData({
        property: '',
        tax_type: 'PROPERTY_TAX',
        fiscal_year: selectedYear,
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        is_paid: false,
        reference_notice: '',
        notes: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement de la taxe.");
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (id: string) => taxService.markTaxAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      queryClient.invalidateQueries({ queryKey: ['tax-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tax-simulation'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors du marquage comme payé.");
    },
  });

  // Delete tax mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxService.deleteTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      queryClient.invalidateQueries({ queryKey: ['tax-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tax-simulation'] });
      setDeleteTaxId(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la suppression.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property) {
      setErrorMessage('Veuillez sélectionner un immeuble.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount.toString()) <= 0) {
      setErrorMessage('Veuillez saisir un montant de taxe valide.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getTaxTypeBadge = (taxType: TaxType) => {
    switch (taxType) {
      case 'PROPERTY_TAX':
        return <Badge variant="blue">Taxe Foncière</Badge>;
      case 'HOUSING_TAX':
        return <Badge variant="purple">Taxe d'Habitation</Badge>;
      case 'INCOME_TAX':
        return <Badge variant="emerald">Impôt Revenus Locatifs</Badge>;
      case 'LOCAL_DEV':
        return <Badge variant="amber">Taxe Aménagement Locale</Badge>;
      default:
        return <Badge variant="slate">Autre taxe</Badge>;
    }
  };

  return (
    <PageContainer
      title="Impôts Fonciers & Fiscalité"
      description="Gestion des avis d'imposition, calendrier des échéances fiscales et simulateur de revenu foncier net imposable."
      action={
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
        >
          Enregistrer un Avis d'Impôt
        </Button>
      }
    >
      {/* Fiscal KPIs Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Impôts Exercice {selectedYear}</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_taxes_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{stats.taxes_count} avis fiscaux répertoriés</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Impôts Acquittés / Payés</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block truncate">
                {stats.paid_taxes_amount} FCFA
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">quittances fiscales enregistrées</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Impôts en Attente</span>
              <span className="text-2xl font-bold text-amber-600 font-['Outfit'] mt-1 block truncate">
                {stats.pending_taxes_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">à régler avant échéance</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Échéances Dépassées</span>
              <span className="text-2xl font-bold text-rose-600 font-['Outfit'] mt-1 block">
                {stats.overdue_taxes_count}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">retards de règlement fiscal</span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tabs Navigation & Year Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Avis d'Imposition & Échéancier
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Simulateur Déclaration Fiscale {selectedYear}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Exercice Fiscal :</span>
          <Select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={[
              { value: '2024', label: '2024' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
              { value: '2027', label: '2027' },
            ]}
          />
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <>
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
            <Input
              placeholder="Rechercher par réf fiscale, avis, immeuble..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Select
              value={taxTypeFilter}
              onChange={(e) => setTaxTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'Tous les types d’impôt' },
                { value: 'PROPERTY_TAX', label: 'Taxe Foncière' },
                { value: 'HOUSING_TAX', label: 'Taxe d’Habitation' },
                { value: 'INCOME_TAX', label: 'Impôt sur Revenus Locatifs' },
                { value: 'LOCAL_DEV', label: 'Taxe d’Aménagement' },
              ]}
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
              value={isPaidFilter}
              onChange={(e) => setIsPaidFilter(e.target.value)}
              options={[
                { value: '', label: 'Tous les états de règlement' },
                { value: 'true', label: 'Acquitté / Payé' },
                { value: 'false', label: 'En attente de paiement' },
              ]}
            />
          </div>

          {/* Taxes Table */}
          <Card>
            <CardBody className="p-0">
              {isTaxesLoading ? (
                <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des avis d'imposition...</div>
              ) : taxes.length === 0 ? (
                <div className="text-center py-16">
                  <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">Aucun avis d'imposition pour l'exercice {selectedYear}</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Enregistrez vos taxes foncières pour planifier vos échéances et conserver vos preuves de règlement.
                  </p>
                  <Button size="sm" onClick={() => setIsModalOpen(true)}>
                    Enregistrer un avis
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Réf. Fiscale</th>
                        <th className="px-6 py-3">N° Avis Officiel</th>
                        <th className="px-6 py-3">Immeuble</th>
                        <th className="px-6 py-3">Type de Taxe</th>
                        <th className="px-6 py-3">Date Limite</th>
                        <th className="px-6 py-3">Montant Impôt</th>
                        <th className="px-6 py-3">Statut</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {taxes.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600">
                            {t.tax_number || '-'}
                          </td>

                          <td className="px-6 py-4 font-mono font-semibold text-slate-800">
                            {t.reference_notice || '-'}
                          </td>

                          <td className="px-6 py-4 font-bold text-slate-900">
                            {t.property_name}
                          </td>

                          <td className="px-6 py-4">
                            {getTaxTypeBadge(t.tax_type)}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 block">{t.due_date}</span>
                            {t.paid_date && (
                              <span className="text-[11px] text-emerald-600 block">Réglé le {t.paid_date}</span>
                            )}
                          </td>

                          <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                            {t.amount} FCFA
                          </td>

                          <td className="px-6 py-4">
                            {t.is_paid ? (
                              <Badge variant="emerald">Acquitté / Payé</Badge>
                            ) : (
                              <Badge variant="amber">En Attente</Badge>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right space-x-2">
                            {!t.is_paid && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                onClick={() => markPaidMutation.mutate(t.id)}
                                isLoading={markPaidMutation.isPending}
                              >
                                Marquer payé
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:bg-rose-50"
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => setDeleteTaxId(t.id)}
                            >
                              Supprimer
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
        </>
      ) : (
        /* Fiscal Simulator View */
        <div className="space-y-6">
          {isSimLoading ? (
            <div className="text-center py-16 text-xs text-slate-400 font-medium">Calcul du bilan fiscal foncier en cours...</div>
          ) : simulation ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Step-by-Step Fiscal Calculation */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      Déclaration Fiscale Foncière — Exercice {simulation.fiscal_year}
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6 text-xs">
                    {/* Line 1: Gross Income */}
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">1. Revenus Locatifs Bruts Perçus (+)</span>
                          <span className="text-[11px] text-slate-500">Total des loyers et charges effectivement encaissés en {simulation.fiscal_year}</span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-700 font-['Outfit']">
                        + {simulation.gross_rental_income} FCFA
                      </span>
                    </div>

                    {/* Line 2: Deductible Expenses Breakdown */}
                    <div className="p-5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-rose-100/80">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                            <TrendingDown className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">2. Charges Déductibles Justifiées (-)</span>
                            <span className="text-[11px] text-slate-500">Dépenses d'entretien, réparations, primes d'assurance et intérêts</span>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-rose-700 font-['Outfit']">
                          - {simulation.total_deductible_expenses} FCFA
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 text-slate-600">
                        <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-100">
                          <span>Travaux & Maintenance :</span>
                          <span className="font-semibold text-slate-900">{simulation.repairs_maintenance_deductible} FCFA</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-100">
                          <span>Assurances PNO / Immeuble :</span>
                          <span className="font-semibold text-slate-900">{simulation.insurance_deductible} FCFA</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-100">
                          <span>Intérêts d'Emprunt :</span>
                          <span className="font-semibold text-slate-900">{simulation.mortgage_interest_deductible} FCFA</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded-lg border border-slate-100">
                          <span>Frais de Gestion & Syndic :</span>
                          <span className="font-semibold text-slate-900">{simulation.management_fees_deductible} FCFA</span>
                        </div>
                      </div>
                    </div>

                    {/* Line 3: Net Taxable Real Estate Income */}
                    <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
                          3. Revenu Foncier Net Imposable (=)
                        </span>
                        <span className="text-[11px] text-blue-700">Base nette soumise au barème d'imposition foncière</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-900 font-['Outfit']">
                        {simulation.net_taxable_income} FCFA
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Right Col: Tax Breakdown & Cash-Flow */}
              <div className="space-y-6">
                <Card className="bg-slate-900 text-white border-slate-800">
                  <CardHeader className="border-b border-slate-800 pb-3">
                    <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-400" />
                      Estimation Impôt Foncier Dû
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="p-5 text-xs space-y-4">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Taux forfaitaire indicatif</span>
                      <span className="font-bold text-white">{simulation.estimated_tax_rate}</span>
                    </div>

                    <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                      <span className="text-[11px] text-slate-400 block mb-1">Montant Prévisionnel d'Impôt</span>
                      <span className="text-2xl font-bold text-amber-400 font-['Outfit'] block">
                        {simulation.estimated_tax_amount} FCFA
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-slate-300">Cash-Flow Net Après Impôt :</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {simulation.net_cashflow_after_tax} FCFA
                      </span>
                    </div>
                  </CardBody>
                </Card>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Conseil d'Optimisation Fiscale
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Toutes vos factures d'entretien et travaux enregistrées dans l'onglet Dépenses avec la case "Déductible" cochée réduisent automatiquement votre assiette fiscale imposable.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Modal Enregistrer Avis d'Imposition */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer un Avis d'Imposition"
        description="Saisissez les informations de votre taxe foncière ou impôt locatif pour planifier son échéance de règlement."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Immeuble concerné"
              required
              value={formData.property}
              onChange={(e) => setFormData({ ...formData, property: e.target.value })}
              options={[
                { value: '', label: '-- Sélectionner un immeuble --' },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Type d'imposition"
              value={formData.tax_type}
              onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as TaxType })}
              options={[
                { value: 'PROPERTY_TAX', label: 'Taxe Foncière' },
                { value: 'HOUSING_TAX', label: 'Taxe d’Habitation' },
                { value: 'INCOME_TAX', label: 'Impôt sur Revenus Locatifs' },
                { value: 'LOCAL_DEV', label: 'Taxe d’Aménagement' },
                { value: 'OTHER', label: 'Autre taxe' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Année / Exercice Fiscal"
              value={formData.fiscal_year.toString()}
              onChange={(e) => setFormData({ ...formData, fiscal_year: parseInt(e.target.value) })}
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
                { value: '2027', label: '2027' },
              ]}
            />

            <Input
              label="Montant de l'impôt (FCFA)"
              type="number"
              required
              placeholder="ex: 280000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date limite de paiement"
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />

            <Input
              label="N° Avis d'imposition / Réf fiscale"
              placeholder="ex: AVIS-FONCIER-2026-991"
              value={formData.reference_notice}
              onChange={(e) => setFormData({ ...formData, reference_notice: e.target.value })}
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Déjà réglé / Acquitté</span>
              <span className="text-[11px] text-slate-500">Cochez si cet impôt a déjà été payé à la recette des impôts.</span>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer"
              checked={formData.is_paid}
              onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
            />
          </div>

          <Input
            label="Notes complémentaires"
            placeholder="ex: Payé par chèque du compte d'exploitation..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Enregistrer l'avis fiscal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Supprimer */}
      <Modal
        isOpen={!!deleteTaxId}
        onClose={() => setDeleteTaxId(null)}
        title="Supprimer l'avis d'imposition"
        description="Êtes-vous sûr de vouloir supprimer cet avis fiscal ? Cette action est irréversible."
      >
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" onClick={() => setDeleteTaxId(null)}>
            Annuler
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
            onClick={() => deleteTaxId && deleteMutation.mutate(deleteTaxId)}
            isLoading={deleteMutation.isPending}
          >
            Confirmer la suppression
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
};
