import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth/authService';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';
  const urlUid = searchParams.get('uid') || '';

  const [email, setEmail] = useState(urlEmail);
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlToken) setToken(urlToken);
  }, [urlEmail, urlToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    if (!token) {
      setErrorMessage("Le jeton de sécurité est manquant. Veuillez recliquer sur le lien reçu par email.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword({
        email,
        token,
        uid: urlUid || undefined,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.message || 'Échec de la réinitialisation du mot de passe.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/30 mb-4">
          IM
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight font-['Outfit']">
          Nouveau mot de passe
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Définissez un nouveau mot de passe sécurisé pour votre compte.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-1">Mot de passe réinitialisé !</span>
                  <span>Votre nouveau mot de passe a été enregistré avec succès. Vous pouvez maintenant vous connecter.</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full"
                size="lg"
              >
                Se connecter avec mon nouveau mot de passe
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Adresse Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />

              {!urlToken && (
                <Input
                  label="Jeton de réinitialisation (Token)"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Code ou jeton reçu par email"
                  className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500 font-mono text-xs"
                />
              )}

              <Input
                label="Nouveau mot de passe"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 8 caractères, lettres et chiffres"
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    title={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />

              <Input
                label="Confirmer le nouveau mot de passe"
                type={showPasswordConfirm ? 'text' : 'password'}
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    title={showPasswordConfirm ? "Masquer" : "Afficher"}
                  >
                    {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Mettre à jour mon mot de passe
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Annuler et retourner à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
