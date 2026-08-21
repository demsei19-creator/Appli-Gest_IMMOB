import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderArchive,
  Plus,
  Search,
  Building2,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  HardDrive,
  Download,
  ExternalLink,
  Trash2,
  UploadCloud,
  AlertCircle,
  FileCheck2,
  Users,
  KeyRound,
  Layers,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { documentService, DocumentUploadPayload } from '@/services/documents/documentService';
import { propertyService } from '@/services/properties/propertyService';
import { tenantService } from '@/services/tenants/tenantService';
import { leaseService } from '@/services/leases/leaseService';
import { DocumentType } from '@/types';

export const DocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>('LEASE_CONTRACT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [description, setDescription] = useState('');

  // Queries
  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: [
      'documents',
      {
        document_type: docTypeFilter,
        property: propertyFilter,
        tenant: tenantFilter,
        search,
      },
    ],
    queryFn: () =>
      documentService.getDocuments({
        document_type: docTypeFilter || undefined,
        property: propertyFilter || undefined,
        tenant: tenantFilter || undefined,
        search: search || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: () => documentService.getDocumentStats(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getProperties(),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getTenants(),
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases'],
    queryFn: () => leaseService.getLeases(),
  });

  // Selected property for unit filtering in modal
  const selectedPropertyObj = properties.find((p) => p.id === propertyId);
  const availableUnits = selectedPropertyObj?.units || [];

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (payload: DocumentUploadPayload) => documentService.uploadDocument(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors du téléversement du document.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-stats'] });
      setDeleteDocId(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la suppression.');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDocType('LEASE_CONTRACT');
    setSelectedFile(null);
    setPropertyId('');
    setUnitId('');
    setTenantId('');
    setLeaseId('');
    setDescription('');
    setErrorMessage(null);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Veuillez saisir un titre pour le document.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Veuillez sélectionner un fichier à téléverser.');
      return;
    }
    setErrorMessage(null);

    uploadMutation.mutate({
      title: title.trim(),
      document_type: docType,
      file: selectedFile,
      property: propertyId || undefined,
      unit: unitId || undefined,
      tenant: tenantId || undefined,
      lease: leaseId || undefined,
      description: description.trim() || undefined,
    });
  };

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'LEASE_CONTRACT':
        return <Badge variant="blue">Contrat de bail</Badge>;
      case 'ID_CARD':
        return <Badge variant="purple">Pièce d’identité</Badge>;
      case 'RENT_RECEIPT':
        return <Badge variant="emerald">Quittance de loyer</Badge>;
      case 'INVOICE':
        return <Badge variant="amber">Facture / Échéance</Badge>;
      case 'TAX_NOTICE':
        return <Badge variant="rose">Avis fiscal</Badge>;
      case 'PROPERTY_DEED':
        return <Badge variant="purple">Titre de propriété</Badge>;
      case 'INSURANCE':
        return <Badge variant="blue">Assurance</Badge>;
      case 'PHOTO':
        return <Badge variant="slate">Photo / État des lieux</Badge>;
      default:
        return <Badge variant="slate">Autre document</Badge>;
    }
  };

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    const lowerName = (fileName || '').toLowerCase();
    if (mimeType?.startsWith('image/') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
      return <FileImage className="w-5 h-5 text-purple-600" />;
    }
    if (mimeType?.includes('pdf') || lowerName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <PageContainer
      title="Coffre-Fort & Documents (GED)"
      description="Gestion Électronique des Documents : baux, pièces d’identité, quittances, factures et titres de propriété."
      action={
        <Button
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          Téléverser un Document
        </Button>
      }
    >
      {/* Storage KPIs */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Documents</span>
              <span className="text-2xl font-bold text-slate-900 font-['Outfit'] mt-1 block">
                {stats.total_documents}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">fichiers indexés et sécurisés</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Espace Consommé</span>
              <span className="text-2xl font-bold text-blue-600 font-['Outfit'] mt-1 block">
                {stats.storage_formatted}
              </span>
              <span className="text-[11px] text-blue-700 mt-1 block">stockage cloud alloué</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Contrats & Titres</span>
              <span className="text-2xl font-bold text-indigo-600 font-['Outfit'] mt-1 block">
                {stats.contracts_count}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">actes juridiques et baux</span>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pièces & Quittances</span>
              <span className="text-2xl font-bold text-emerald-600 font-['Outfit'] mt-1 block">
                {stats.receipts_invoices_count + stats.ids_count}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">justificatifs et quittances</span>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <Input
          placeholder="Rechercher par nom, réf, locataire, immeuble..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <Select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'Toutes les catégories' },
            { value: 'LEASE_CONTRACT', label: 'Contrat de bail' },
            { value: 'ID_CARD', label: 'Pièce d’identité' },
            { value: 'RENT_RECEIPT', label: 'Quittance de loyer' },
            { value: 'INVOICE', label: 'Facture / Échéance' },
            { value: 'TAX_NOTICE', label: 'Avis fiscal' },
            { value: 'PROPERTY_DEED', label: 'Titre de propriété' },
            { value: 'INSURANCE', label: 'Contrat d’assurance' },
            { value: 'PHOTO', label: 'Photo / État des lieux' },
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
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          options={[
            { value: '', label: 'Tous les locataires' },
            ...tenants.map((t) => ({ value: t.id, label: t.full_name })),
          ]}
        />
      </div>

      {/* Documents Table */}
      <Card>
        <CardBody className="p-0">
          {isDocsLoading ? (
            <div className="text-center py-12 text-xs font-medium text-slate-400">Chargement des documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <FolderArchive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Aucun document trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Téléversez et centralisez l'ensemble de vos pièces juridiques, baux, quittances et factures.
              </p>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                Téléverser un document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Réf. GED</th>
                    <th className="px-6 py-3">Intitulé du Fichier</th>
                    <th className="px-6 py-3">Catégorie</th>
                    <th className="px-6 py-3">Périmètre Rattaché</th>
                    <th className="px-6 py-3">Taille</th>
                    <th className="px-6 py-3">Date d'Ajout</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {d.doc_number || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                            {getFileIcon(d.mime_type, d.title)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{d.title}</span>
                            {d.description && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-xs">{d.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {getDocTypeBadge(d.document_type)}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {d.property_name && (
                          <div className="flex items-center gap-1 font-semibold text-slate-900">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{d.property_name}</span>
                            {d.unit_number && <span className="text-slate-500 font-normal">({d.unit_number})</span>}
                          </div>
                        )}
                        {d.tenant_name && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{d.tenant_name}</span>
                          </div>
                        )}
                        {d.lease_contract_number && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 mt-0.5 font-mono">
                            <KeyRound className="w-3 h-3 text-blue-400" />
                            <span>{d.lease_contract_number}</span>
                          </div>
                        )}
                        {!d.property_name && !d.tenant_name && !d.lease_contract_number && (
                          <span className="text-slate-400 italic">Global</span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {d.formatted_file_size || '0 Ko'}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {d.file && (
                          <a
                            href={d.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Télécharger / Visualiser"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setDeleteDocId(d.id)}
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

      {/* Modal Téléverser un Document */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Téléverser un Document dans le Coffre-Fort"
        description="Ajoutez un fichier numérique et associez-le à un immeuble, un logement ou un locataire."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Titre du document"
              required
              placeholder="ex: Contrat de bail signé Angré"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Select
              label="Catégorie de document"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              options={[
                { value: 'LEASE_CONTRACT', label: 'Contrat de bail' },
                { value: 'ID_CARD', label: 'Pièce d’identité' },
                { value: 'RENT_RECEIPT', label: 'Quittance de loyer' },
                { value: 'INVOICE', label: 'Facture / Échéance' },
                { value: 'TAX_NOTICE', label: 'Avis fiscal' },
                { value: 'PROPERTY_DEED', label: 'Titre de propriété' },
                { value: 'INSURANCE', label: 'Contrat d’assurance' },
                { value: 'PHOTO', label: 'Photo / État des lieux' },
                { value: 'OTHER', label: 'Autre document' },
              ]}
            />
          </div>

          {/* File Input Box */}
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition-all">
            <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  if (!title) {
                    setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 block"
            >
              {selectedFile ? selectedFile.name : 'Cliquez pour sélectionner un fichier (PDF, Image, Doc...)'}
            </label>
            <span className="text-[11px] text-slate-400 block mt-1">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} Ko`
                : 'Taille maximale autorisée : 20 Mo'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Immeuble rattaché (optionnel)"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId('');
              }}
              options={[
                { value: '', label: '-- Aucun immeuble --' },
                ...properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Logement rattaché (optionnel)"
              disabled={!propertyId}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              options={[
                { value: '', label: '-- Aucun lot --' },
                ...availableUnits.map((u) => ({ value: u.id, label: `Lot ${u.unit_number}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Locataire rattaché (optionnel)"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              options={[
                { value: '', label: '-- Aucun locataire --' },
                ...tenants.map((t) => ({ value: t.id, label: t.full_name })),
              ]}
            />

            <Select
              label="Bail rattaché (optionnel)"
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              options={[
                { value: '', label: '-- Aucun bail --' },
                ...leases.map((l) => ({
                  value: l.id,
                  label: `${l.lease_number} (${l.tenant_name || 'Bail'})`,
                })),
              ]}
            />
          </div>

          <Input
            label="Description / Commentaires"
            placeholder="ex: Pièce numérisée par le gestionnaire..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={uploadMutation.isPending}>
              Téléverser dans le coffre-fort
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Supprimer */}
      <Modal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        title="Supprimer le document"
        description="Êtes-vous sûr de vouloir supprimer ce document du coffre-fort ? Cette action est irréversible."
      >
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" onClick={() => setDeleteDocId(null)}>
            Annuler
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
            onClick={() => deleteDocId && deleteMutation.mutate(deleteDocId)}
            isLoading={deleteMutation.isPending}
          >
            Confirmer la suppression
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
};
