import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Shield, ShieldAlert, CheckCircle2, XCircle, Search, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { User } from '@/types';
import { authService, SubUserCreatePayload } from '@/services/auth/authService';

export const TeamManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<SubUserCreatePayload>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: 'MANAGER',
    password: '',
  });

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => authService.getTeamMembers(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: SubUserCreatePayload) => authService.createTeamMember(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        role: 'MANAGER',
        password: '',
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.error?.message || 'Erreur lors de la création du collaborateur.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      authService.updateTeamMemberStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const handleToggleStatus = (member: User) => {
    statusMutation.mutate({
      userId: member.id,
      isActive: !member.is_active,
    });
  };

  const filteredMembers = teamMembers.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<User>[] = [
    {
      header: 'Collaborateur',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            {row.first_name?.charAt(0) || 'U'}{row.last_name?.charAt(0) || ''}
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs">{row.full_name || `${row.first_name} ${row.last_name}`}</span>
            <span className="text-[11px] text-slate-500">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Rôle & Droits',
      cell: (row) => (
        <Badge variant={row.role === 'MANAGER' ? 'blue' : 'purple'}>
          {row.role_display || (row.role === 'MANAGER' ? 'Gestionnaire' : 'Comptable')}
        </Badge>
      ),
    },
    {
      header: 'Téléphone',
      cell: (row) => <span className="text-xs text-slate-700">{row.phone_number || '-'}</span>,
    },
    {
      header: 'Statut du Compte',
      cell: (row) => (
        <Badge variant={row.is_active ? 'emerald' : 'rose'}>
          {row.is_active ? 'Accès Actif' : 'Accès Suspendu'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStatus(row)}
          isLoading={statusMutation.isPending}
          className={row.is_active ? 'text-rose-600 hover:bg-rose-50 border-rose-200' : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'}
        >
          {row.is_active ? 'Suspendre l\'accès' : 'Réactiver l\'accès'}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Équipe & Gestion des Collaborateurs"
      description="Déléguez la gestion de votre patrimoine à des Gestionnaires ou Comptables en contrôlant strictement leurs accès (Règle 8)."
      action={
        <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Ajouter un Collaborateur
        </Button>
      }
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-72">
          <Input
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />

      {/* Modal to invite / add team member */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer un compte Collaborateur"
        description="Le collaborateur aura accès à votre patrimoine selon les permissions de son rôle."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Nom"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>

          <Input
            label="Adresse Email de connexion"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Numéro de téléphone"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Select
            label="Rôle attribué"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            options={[
              { value: 'MANAGER', label: 'Gestionnaire (Gestion biens, locataires, réparations)' },
              { value: 'ACCOUNTANT', label: 'Comptable (Suivi des paiements, dépenses et impôts)' },
            ]}
          />

          <Input
            label="Mot de passe provisoire"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            leftIcon={<Lock className="w-4 h-4" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            helperText="Le collaborateur pourra le modifier depuis son profil."
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Créer le compte
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};
