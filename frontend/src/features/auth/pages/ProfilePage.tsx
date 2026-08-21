import React, { useState } from 'react';
import { User as UserIcon, Mail, Phone, Building, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/auth/authService';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
    company_name: user?.company_name || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setIsUpdatingProfile(true);

    try {
      const updated = await authService.updateProfile(profileForm);
      updateUser(updated);
      setProfileStatus({ type: 'success', message: 'Vos informations personnelles ont été mises à jour avec succès.' });
    } catch (err: any) {
      setProfileStatus({
        type: 'error',
        message: err.response?.data?.error?.message || 'Erreur lors de la mise à jour du profil.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setPasswordStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Le mot de passe doit comporter au moins 8 caractères.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const message = await authService.changePassword(passwordForm);
      setPasswordStatus({ type: 'success', message });
      setPasswordForm({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err.response?.data?.error?.message || 'Erreur lors du changement de mot de passe.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const displayName = user?.full_name || `${user?.first_name} ${user?.last_name}`.trim() || 'Utilisateur';

  return (
    <PageContainer
      title="Mon Profil & Paramètres du Compte"
      description="Gérez vos informations de compte, vos coordonnées et la sécurité de vos accès."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity Card */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-4">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-slate-900 text-lg font-['Outfit']">{displayName}</h3>
              <p className="text-xs text-slate-500 mb-3">{user?.email}</p>
              <Badge variant="blue" className="px-3 py-1 text-xs">
                {user?.role_display || (user?.role === 'OWNER' ? 'Propriétaire' : user?.role === 'MANAGER' ? 'Gestionnaire' : 'Comptable')}
              </Badge>

              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-left text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Patrimoine / Société</span>
                  <span className="font-semibold text-slate-800">{user?.company_name || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Téléphone</span>
                  <span className="font-semibold text-slate-800">{user?.phone_number || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Statut du compte</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Actif & Sécurisé
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-blue-100 bg-blue-50/50">
            <CardBody className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-900">
                  <span className="font-bold block mb-1">Règles de sécurité</span>
                  <p className="text-blue-700">
                    Vos sessions sont sécurisées par des jetons JWT à rotation automatique. Ne partagez jamais vos identifiants.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right 2 Columns: Edit Profile & Change Password Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles & Coordonnées</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              {profileStatus && (
                <div className={`mb-5 p-3 rounded-xl flex items-center gap-2.5 text-xs ${profileStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {profileStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{profileStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    required
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  />
                  <Input
                    label="Nom"
                    required
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Adresse Email (Identifiant)"
                    type="email"
                    disabled
                    value={user?.email || ''}
                    leftIcon={<Mail className="w-4 h-4" />}
                    helperText="L'adresse email est votre identifiant de connexion unique."
                  />
                  <Input
                    label="Téléphone"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </div>

                <Input
                  label="Nom de Société / Entité Patrimoniale"
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                  leftIcon={<Building className="w-4 h-4" />}
                />

                <div className="pt-2 flex justify-end">
                  <Button type="submit" isLoading={isUpdatingProfile}>
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sécurité & Mot de Passe</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              {passwordStatus && (
                <div className={`mb-5 p-3 rounded-xl flex items-center gap-2.5 text-xs ${passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {passwordStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  label="Mot de passe actuel"
                  type="password"
                  required
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  leftIcon={<Lock className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nouveau mot de passe"
                    type="password"
                    required
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    leftIcon={<Lock className="w-4 h-4" />}
                    helperText="Minimum 8 caractères, lettres et chiffres."
                  />
                  <Input
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    required
                    value={passwordForm.new_password_confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirm: e.target.value })}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="outline" isLoading={isUpdatingPassword}>
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
