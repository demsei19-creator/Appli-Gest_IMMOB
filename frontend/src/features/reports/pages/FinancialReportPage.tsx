import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Percent,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { dashboardService } from '@/services/dashboard/dashboardService';
import { propertyService } from '@/services/properties/propertyService';

export const FinancialReportPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['financial-report', { year: selectedYear, property: selectedProperty }],
    queryFn: () =>
      dashboardService.getFinancialReport({
        year: selectedYear,
        property: selectedProperty || undefined,
      }),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageContainer
      title="Rapports de Gestion Financière"
      description="Compte de résultat locatif consolidé, bilan annuel et état d'occupation par immeuble."
      action={
        <div className="flex items-center gap-3 no-print">
          <Button variant="outline" size="md" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Imprimer le Bilan Officiel
          </Button>
        </div>
      }
    >
      {/* Controls Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-white rounded-2xl border border-slate-200 no-print">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Exercice :</span>
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

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Périmètre :</span>
            <Select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              options={[
                { value: '', label: 'Tous les immeubles (Consolidé)' },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        <span className="text-xs text-slate-400">
          Document certifié conforme aux écritures comptables
        </span>
      </div>

      {/* Printable Report Document */}
      {isLoading || !report ? (
        <div className="text-center py-20 text-xs text-slate-400 font-medium">
          Génération du compte de résultat en cours...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-4xl mx-auto printable-report text-slate-900">
          {/* Official Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6 flex justify-between items-start">
            <div>
              <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider block">
                RAPPORT DE GESTION LOCATIVE & BILAN FINANCIER
              </span>
              <h1 className="text-2xl font-bold font-['Outfit'] text-slate-900 mt-1">
                {report.company_name}
              </h1>
              <span className="text-xs text-slate-500 block mt-0.5">
                Bailleur : {report.owner_name} ({report.owner_email})
              </span>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg font-mono">
                EXERCICE {report.report_year}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Édité le {report.generated_at}</span>
            </div>
          </div>

          {/* 4 Top Summary Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Loyers Émis</span>
              <span className="text-base font-bold text-slate-900 font-['Outfit'] mt-1 block">
                {report.summary.expected_rent} FCFA
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Loyers Encaissés</span>
              <span className="text-base font-bold text-emerald-700 font-['Outfit'] mt-1 block">
                {report.summary.collected_rent} FCFA
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">
                {report.summary.collection_rate_percent}% recouvré
              </span>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Charges & Dépenses</span>
              <span className="text-base font-bold text-rose-700 font-['Outfit'] mt-1 block">
                - {report.summary.total_expenses} FCFA
              </span>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Résultat Net (NOI)</span>
              <span className="text-base font-bold text-blue-900 font-['Outfit'] mt-1 block">
                {report.summary.net_operating_result} FCFA
              </span>
            </div>
          </div>

          {/* Detailed Income Statement Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              1. Compte de Résultat d'Exploitation Consolidé
            </h3>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-emerald-50/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Total Loyers et Charges Encaissés (+)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono text-sm">
                    + {report.summary.collected_rent} FCFA
                  </td>
                </tr>

                {report.expenses_breakdown.map((exp, idx) => (
                  <tr key={idx} className="text-slate-600">
                    <td className="py-2 px-6">Dont {exp.category}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">- {exp.amount} FCFA</td>
                  </tr>
                ))}

                <tr className="bg-rose-50/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Total Dépenses & Entretien Décaissés (-)</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-700 font-mono text-sm">
                    - {report.summary.total_expenses} FCFA
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Impôts et Taxes Foncières Réglés (-)</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    - {report.summary.total_taxes_paid} FCFA
                  </td>
                </tr>

                <tr className="bg-slate-900 text-white font-bold">
                  <td className="py-3 px-4 rounded-l-xl text-sm">RÉSULTAT NET D'EXPLOITATION (=)</td>
                  <td className="py-3 px-4 rounded-r-xl text-right font-mono text-base text-emerald-400">
                    {report.summary.net_operating_result} FCFA
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Property-by-Property Breakdown Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-200 pb-2">
              2. Ventilation des Performances par Immeuble
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Immeuble</th>
                  <th className="py-2.5 px-3">Occupation</th>
                  <th className="py-2.5 px-3">Loyers Émis</th>
                  <th className="py-2.5 px-3">Loyers Reçus</th>
                  <th className="py-2.5 px-3">Dépenses</th>
                  <th className="py-2.5 px-3 text-right">Résultat Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.properties_breakdown.map((p) => (
                  <tr key={p.property_id}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {p.property_name}
                      <span className="text-[10px] text-slate-400 block font-normal">{p.property_city}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{p.occupancy_rate_percent}%</span>
                      <span className="text-[10px] text-slate-400 block">{p.occupied_units}/{p.total_units} lots</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{p.expected_rent} FCFA</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600">{p.collected_rent} FCFA</td>
                    <td className="py-2.5 px-3 font-mono text-rose-600">{p.expenses} FCFA</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{p.net_operating_result} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures & Certification Block */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-800 block mb-8">Le Propriétaire / Mandataire :</span>
              <div className="border-b border-slate-300 w-48" />
              <span className="text-[10px] text-slate-400 mt-1 block">Signature et date</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-800 block mb-8">Visa du Responsable Comptable :</span>
              <div className="border-b border-slate-300 w-48 ml-auto" />
              <span className="text-[10px] text-slate-400 mt-1 block">Cachet et signature</span>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
