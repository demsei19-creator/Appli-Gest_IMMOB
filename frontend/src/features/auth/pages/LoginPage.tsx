import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState('demo@appli-imob.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.message || 'Identifiants incorrects ou compte indisponible.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      // Check if Google Client ID is configured in window/env
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      // If Google Identity Services SDK is loaded on window
      if ((window as any).google?.accounts?.id && googleClientId) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              await googleLogin({ id_token: response.credential });
              navigate(from, { replace: true });
            } catch (err: any) {
              setErrorMessage(err.response?.data?.error?.message || "Échec de l'authentification Google.");
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });
        (window as any).google.accounts.id.prompt();
      } else {
        // Fallback for seamless developer testing / prompt
        const promptEmail = window.prompt("Entrez l'adresse email de votre compte Google :", "amadou.diallo@gmail.com");
        if (!promptEmail) {
          setIsGoogleLoading(false);
          return;
        }

        await googleLogin({
          email: promptEmail,
          first_name: "Amadou",
          last_name: "Diallo",
          company_name: "Diallo Invest Immobilier",
        });
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.message || "Impossible de se connecter avec Google.";
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
          ImmoGestion Pro
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Plateforme de Gestion de Patrimoine Immobilier
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

          {/* Google Sign-in Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition-all duration-150 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              {isGoogleLoading ? 'Connexion Google en cours...' : 'Continuer avec Google'}
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Adresse Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
            />

            <div>
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Se Connecter
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <span>Nouveau propriétaire ? </span>
            <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
