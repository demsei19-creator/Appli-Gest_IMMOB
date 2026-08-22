import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; reset_link?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const data = await authService.forgotPassword({ email });
      setSuccessInfo({
        message: data.message || "Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.",
        reset_link: data.reset_link,
      });
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || err.message || 'Une erreur est survenue lors de la demande.';
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
          Mot de passe oublié ?
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.
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

          {successInfo ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-1">Email de réinitialisation envoyé</span>
                  <span>{successInfo.message}</span>
                </div>
              </div>

              {successInfo.reset_link && (
                <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-xl">
                  <span className="text-[11px] text-blue-300 font-semibold block mb-1.5">
                    🔗 Accès direct (Lien généré) :
                  </span>
                  <a
                    href={successInfo.reset_link}
                    className="text-xs text-blue-400 hover:text-blue-300 underline break-all font-mono"
                  >
                    Réinitialiser mon mot de passe maintenant &rarr;
                  </a>
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la page de connexion
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Adresse Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@domaine.com"
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-950 text-white border-slate-700 placeholder:text-slate-500"
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Envoyer le lien de réinitialisation
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
