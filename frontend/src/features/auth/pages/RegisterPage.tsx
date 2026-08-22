import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Building, Phone, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phoneNumber: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password !== formData.passwordConfirm) {
      setErrorMessage('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        password_confirm: formData.passwordConfirm,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName,
        phone_number: formData.phoneNumber,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.message ||
        "Une erreur est survenue lors de la création de l'espace Propriétaire.";
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if ((window as any).google?.accounts?.id && googleClientId) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              await googleLogin({ id_token: response.credential });
              navigate('/dashboard', { replace: true });
            } catch (err: any) {
              setErrorMessage(err.response?.data?.error?.message || "Échec de l'inscription Google.");
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });
        (window as any).google.accounts.id.prompt();
      } else {
        const promptEmail = window.prompt("Entrez l'adresse email de votre compte Google :", "");
        if (!promptEmail) {
          setIsGoogleLoading(false);
          return;
        }

        await googleLogin({
          email: promptEmail,
          first_name: "Nouveau",
          last_name: "Propriétaire",
          company_name: "Patrimoine Immobilier",
        });
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.message || "Impossible de s'inscrire avec Google.";
      setErrorMessage(serverMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/30 mb-4">
          IM
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight font-['Outfit']">
          Créer un compte Propriétaire
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Rejoignez la plateforme SaaS de pilotage de patrimoine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg w-full">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign-up Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-all duration-150 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              {isGoogleLoading ? 'Création de compte Google...' : "S'inscrire avec Google"}
            </button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">OU AVEC EMAIL</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                leftIcon={<User className="w-4 h-4" />}
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />
              <Input
                label="Nom de famille"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                leftIcon={<User className="w-4 h-4" />}
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />
            </div>

            <Input
              label="Adresse Email professionnelle"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom de la société / Patrimoine"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                leftIcon={<Building className="w-4 h-4" />}
                placeholder="Ex: SCI Les Oliviers"
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />
              <Input
                label="Numéro de téléphone"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="+225 07..."
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                label="Confirmer le mot de passe"
                type={showPasswordConfirm ? 'text' : 'password'}
                required
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
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
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Créer mon espace Propriétaire
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Vous avez déjà un compte ? </span>
            <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
