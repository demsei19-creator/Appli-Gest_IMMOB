import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileText,
  Tag,
  Wrench,
  Percent,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { expenseService, ExpenseCreatePayload } from '@/services/expenses/expenseService';
import { propertyService } from '@/services/properties/propertyService';
import { supplierService } from '@/services/suppliers/supplierService';
import { ExpenseCategory } from '@/types';

export const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [deductibleFilter, setDeductibleFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<ExpenseCreatePayload>({
    property: '',
    unit: '',
    supplier: '',
    category: 'MAINTENANCE',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    paid_to: '',
    is_deductible: true,
    notes: '',
  });

  // Query properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  // Selected property units
  const selectedProperty = properties.find((p) => p.id === formData.property);
  const units = selectedProperty?.units || [];

  // Query suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supplierService.getSuppliers(),
  });

  // Query expenses list
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: [
      'expenses',
      {
        month: selectedMonth,
        year: selectedYear,
        category: categoryFilter,
        property: propertyFilter,
        deductible: deductibleFilter,
        search,
      },
    ],
    queryFn: () =>
      expenseService.getExpenses({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
        category: categoryFilter || undefined,
        property: propertyFilter || undefined,
        is_deductible: deductibleFilter ? deductibleFilter === 'true' : undefined,
        search: search || undefined,
      }),
  });

  // Query expenses KPIs
  const { data: stats } = useQuery({
    queryKey: ['expense-stats', { month: selectedMonth, year: selectedYear }],
    queryFn: () =>
      expenseService.getExpenseStats({
        month: selectedMonth || undefined,
        year: selectedYear || undefined,
      }),
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: (payload: ExpenseCreatePayload) => {
      const formatted = {
        ...payload,
        unit: payload.unit || undefined,
        supplier: payload.supplier || undefined,
      };
      return expenseService.createExpense(formatted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      setIsModalOpen(false);
      setFormData({
        property: '',
        unit: '',
        supplier: '',
        category: 'MAINTENANCE',
        title: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        paid_to: '',
        is_deductible: true,
        notes: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || "Erreur lors de l'enregistrement de la dépense.");
    },
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      setDeleteExpenseId(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la suppression de la dépense.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property) {
      setErrorMessage('Veuillez sélectionner un immeuble.');
      return;
    }
    if (!formData.title.trim()) {
      setErrorMessage("Veuillez saisir l'intitulé de la dépense.");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount.toString()) <= 0) {
      setErrorMessage('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'REPAIRS':
        return <Badge variant="rose">Travaux & Réparations</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="blue">Entretien courant</Badge>;
      case 'INSURANCE':
        return <Badge variant="purple">Assurance Immeuble</Badge>;
      case 'UTILITIES':
        return <Badge variant="amber">Eau & Électricité</Badge>;
      case 'MANAGEMENT':
        return <Badge variant="slate">Frais de gestion / Syndic</Badge>;
      case 'SECURITY':
        return <Badge variant="slate">Gardiennage & Sécurité</Badge>;
      case 'MORTGAGE':
        return <Badge variant="emerald">Intérêts d’emprunt</Badge>;
      default:
        return <Badge variant="slate">Autres charges</Badge>;
    }
  };

  return (
    <PageContainer
      title="Dépenses & Charges"
      description="Journal des décaissements et factures payées avec marquage de déductibilité fiscale pour le calcul d'impôts."
      action={
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
        >
          Enregistrer une Dépense
        </Button>
      }
    >
      {/* Financial KPIs Banner */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Dépenses (Période)</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block truncate">
                {stats.total_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{stats.expenses_count} factures décaissées</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Charges Déductibles</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block truncate">
                {stats.deductible_amount} FCFA
              </span>
              <span className="text-[11px] text-emerald-700 mt-1 block">déductibles de l'impôt foncier</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Charges Non Déductibles</span>
              <span className="text-2xl font-bold text-slate-500 font-['Outfit'] mt-1 block truncate">
                {stats.non_deductible_amount} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">frais privatifs ou exclus</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Travaux & Entretien</span>
              <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block truncate">
                {(parseFloat(stats.repairs_amount || '0') + parseFloat(stats.maintenance_amount || '0')).toFixed(2)} FCFA
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">réparations & maintenance</span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6">
        <Input
          placeholder="Rechercher par référence, libellé, fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="sm:col-span-2"
        />

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'Toutes les catégories' },
            { value: 'REPAIRS', label: 'Travaux & Réparations' },
            { value: 'MAINTENANCE', label: 'Entretien courant' },
            { value: 'INSURANCE', label: 'Assurance Immeuble' },
            { value: 'UTILITIES', label: 'Eau & Électricité' },
            { value: 'MANAGEMENT', label: 'Frais de gestion / Syndic' },
            { value: 'SECURITY', label: 'Gardiennage & Sécurité' },
            { value: 'MORTGAGE', label: 'Intérêts d’emprunt' },
            { value: 'OTHER', label: 'Autres charges' },
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
          value={selectedMonth.toString()}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          options={[
            { value: '1', label: 'Janvier' },
            { value: '2', label: 'Février' },
            { value: '3', label: 'Mars' },
            { value: '4', label: 'Avril' },
            { value: '5', label: 'Mai' },
            { value: '6', label: 'Juin' },
            { value: '7', label: 'Juillet' },
            { value: '8', label: 'Août' },
            { value: '9', label: 'Septembre' },
            { value: '10', label: 'Octobre' },
            { value: '11', label: 'Novembre' },
            { value: '12', label: 'Décembre' },
          ]}
        />

        <Select
          value={selectedYear.toString()}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          options={[
            { value: '2025', label: '2025' },
            { value: '2026', label: '2026' },
            { value: '2027', label: '2027' },
          ]}
        />
      </div>

      {/* Expenses Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des dépenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucune dépense enregistrée pour cette période</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Enregistrez vos factures d'entretien, primes d'assurance et frais pour un suivi budgétaire précis.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Enregistrer une dépense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Réf. Dépense</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Immeuble & Lot</th>
                    <th className="px-6 py-3">Catégorie</th>
                    <th className="px-6 py-3">Libellé / Détails</th>
                    <th className="px-6 py-3">Bénéficiaire</th>
                    <th className="px-6 py-3">Fiscalité</th>
                    <th className="px-6 py-3">Montant TTC</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {exp.expense_number || '-'}
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {exp.expense_date}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">{exp.property_name}</span>
                        <span className="text-slate-500 text-[11px]">
                          {exp.unit_number ? `Lot ${exp.unit_number}` : 'Charges générales immeuble'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {getCategoryBadge(exp.category)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 block">{exp.title}</span>
                        {exp.notes && (
                          <span className="text-slate-400 text-[11px] line-clamp-1">{exp.notes}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {exp.supplier_name || exp.paid_to || '-'}
                      </td>

                      <td className="px-6 py-4">
                        {exp.is_deductible ? (
                          <Badge variant="emerald">Déductible</Badge>
                        ) : (
                          <Badge variant="slate">Non déductible</Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                        {exp.amount} FCFA
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setDeleteExpenseId(exp.id)}
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

      {/* Modal Enregistrer Dépense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enregistrer une Dépense / Facture Payée"
        description="Saisissez les informations de la charge décaissée et cochez si elle est déductible fiscalement."
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
              onChange={(e) => setFormData({ ...formData, property: e.target.value, unit: '' })}
              options={[
                { value: '', label: '-- Sélectionner un immeuble --' },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Logement (Optionnel)"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: '', label: 'Charges communes de l’immeuble' },
                ...units.map((u) => ({
                  value: u.id,
                  label: `Lot ${u.unit_number} (${u.unit_type_display || u.unit_type})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Catégorie comptable"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              options={[
                { value: 'REPAIRS', label: 'Travaux & Réparations' },
                { value: 'MAINTENANCE', label: 'Entretien courant' },
                { value: 'INSURANCE', label: 'Assurance Immeuble' },
                { value: 'UTILITIES', label: 'Eau & Électricité parties communes' },
                { value: 'MANAGEMENT', label: 'Frais de gestion / Syndic' },
                { value: 'SECURITY', label: 'Gardiennage & Sécurité' },
                { value: 'MORTGAGE', label: 'Intérêts d’emprunt' },
                { value: 'OTHER', label: 'Autres charges' },
              ]}
            />

            <Input
              label="Intitulé de la dépense"
              required
              placeholder="ex: Facture CIE parties communes ou Vidange fosse..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Montant Décaissé TTC (FCFA)"
              type="number"
              required
              placeholder="ex: 125000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />

            <Input
              label="Date de paiement"
              type="date"
              required
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Artisan / Fournisseur référencé"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              options={[
                { value: '', label: '-- Autre bénéficiaire libre --' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.category_display})`,
                })),
              ]}
            />

            <Input
              label="Bénéficiaire / Société payée"
              placeholder="ex: SODECI / CIE / NSIA Assurances..."
              value={formData.paid_to}
              onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
            />
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Déductibilité Fiscale</span>
                <span className="text-[11px] text-emerald-700">Cette dépense sera déduite du revenu brut pour le calcul de l'impôt foncier.</span>
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
              checked={formData.is_deductible}
              onChange={(e) => setFormData({ ...formData, is_deductible: e.target.checked })}
            />
          </div>

          <Input
            label="Notes complémentaires"
            placeholder="ex: Facture N° 2026-990 réglée par chèque..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Enregistrer la dépense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Supprimer */}
      <Modal
        isOpen={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        title="Supprimer la dépense"
        description="Êtes-vous sûr de vouloir supprimer cette facture de dépense ? Cette action est irréversible."
      >
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" onClick={() => setDeleteExpenseId(null)}>
            Annuler
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
            onClick={() => deleteExpenseId && deleteMutation.mutate(deleteExpenseId)}
            isLoading={deleteMutation.isPending}
          >
            Confirmer la suppression
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
};
