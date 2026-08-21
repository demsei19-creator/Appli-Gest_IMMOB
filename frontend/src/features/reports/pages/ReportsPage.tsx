import React from 'react';
import { BarChart3, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const ReportsPage: React.FC = () => {
  const reportsList = [
    {
      title: 'Grand Livre des Encaissements et Loyers',
      description: 'Détail exhaustif de tous les loyers encaissés par période, immeuble et mode de règlement.',
      format: 'Excel / CSV / PDF',
    },
    {
      title: 'Bilan de Rentabilité Nette par Immeuble',
      description: 'Analyse comparative des revenus bruts, charges, taxes et résultat net d\'exploitation (NOI).',
      format: 'PDF / Excel',
    },
    {
      title: 'Rapport des Impayés et Contentieux',
      description: 'Liste nominative des retards de paiement, antériorité des dettes et relances effectuées.',
      format: 'PDF',
    },
    {
      title: 'État Récapitulatif Fiscal pour Déclaration',
      description: 'Ventilation des revenus fonciers bruts et des charges déductibles (travaux, assurances, intérêts).',
      format: 'PDF / Excel',
    },
  ];

  return (
    <PageContainer
      title="Rapports Financiers & Statistiques"
      description="Génération et export des bilans comptables, états locatifs et rapports de rentabilité."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((rep, idx) => (
          <Card key={idx} hoverEffect>
            <CardBody className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">{rep.title}</h3>
              </div>
              <p className="text-xs text-slate-500">{rep.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">Formats: {rep.format}</span>
                <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                  Générer l'export
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
