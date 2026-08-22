import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';

export interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.full_name || user?.first_name || 'Utilisateur';
  const roleDisplay = user?.role_display || (user?.role === 'OWNER' ? 'Propriétaire' : user?.role === 'MANAGER' ? 'Gestionnaire' : 'Comptable');
  const company = user?.company_name || 'Patrimoine Immobilier';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors focus:outline-none"
          title="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 font-['Outfit'] truncate max-w-[130px] sm:max-w-[240px] md:max-w-none">
            {company}
          </h1>
          <Badge variant="blue" className="text-[10px] uppercase tracking-wider shrink-0 hidden xs:inline-flex">
            {roleDisplay}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification icon */}
        <button
          title="Notifications"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg relative transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
        </button>

        {/* User profile dropdown link */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            title="Accéder à mon profil"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="block text-[10px] text-slate-500">{roleDisplay}</span>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5 sm:ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
