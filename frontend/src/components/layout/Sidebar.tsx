import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  FileSignature,
  Receipt,
  CreditCard,
  Wrench,
  Truck,
  TrendingDown,
  Scale,
  FolderLock,
  BarChart3,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'PILOTAGE',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Rapports & Stats', href: '/reports', icon: <BarChart3 className="w-4 h-4" />, allowedRoles: ['OWNER', 'ACCOUNTANT'] },
    ],
  },
  {
    title: 'PATRIMOINE',
    items: [
      { label: 'Immeubles', href: '/properties', icon: <Building2 className="w-4 h-4" /> },
      { label: 'Logements & Lots', href: '/units', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    title: 'LOCATIONS',
    items: [
      { label: 'Locataires', href: '/tenants', icon: <Users className="w-4 h-4" /> },
      { label: 'Contrats de bail', href: '/leases', icon: <FileSignature className="w-4 h-4" /> },
    ],
  },
  {
    title: 'FINANCES',
    items: [
      { label: 'Avis & Loyers', href: '/billing', icon: <Receipt className="w-4 h-4" /> },
      { label: 'Paiements & Reçus', href: '/payments', icon: <CreditCard className="w-4 h-4" /> },
      { label: 'Dépenses & Charges', href: '/expenses', icon: <TrendingDown className="w-4 h-4" /> },
      { label: 'Impôts & Fiscalité', href: '/taxes', icon: <Scale className="w-4 h-4" />, allowedRoles: ['OWNER', 'ACCOUNTANT'] },
    ],
  },
  {
    title: 'OPÉRATIONS & GED',
    items: [
      { label: 'Maintenance', href: '/maintenance', icon: <Wrench className="w-4 h-4" /> },
      { label: 'Fournisseurs', href: '/suppliers', icon: <Truck className="w-4 h-4" /> },
      { label: 'Documents & GED', href: '/documents', icon: <FolderLock className="w-4 h-4" /> },
      { label: 'Équipe & Collaborateurs', href: '/admin/team', icon: <Users className="w-4 h-4" />, allowedRoles: ['OWNER'] },
      { label: 'Audit & Sécurité', href: '/admin/audit', icon: <ShieldAlert className="w-4 h-4" />, allowedRoles: ['OWNER'] },
    ],
  },
];

interface SidebarContentProps {
  onItemClick?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ onItemClick }) => {
  const { user } = useAuth();
  const currentRole = user?.role;

  // Filter sections and items based on the user's role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.allowedRoles) return true;
        if (!currentRole) return false;
        return item.allowedRoles.includes(currentRole);
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    )
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Tenant Isolation / Environment info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-slate-400 font-medium">Système Opérationnel</span>
        </div>
        <span className="text-[10px] text-slate-500 block mt-0.5">
          Espace {user?.role_display || (user?.role === 'OWNER' ? 'Propriétaire' : user?.role === 'MANAGER' ? 'Gestionnaire' : 'Comptable')}
        </span>
      </div>
    </>
  );
};

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* 1. Desktop Sidebar (always visible on lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-300 h-screen sticky top-0 shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
            IM
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base font-['Outfit']">ImmoGestion</span>
            <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">SaaS Immobilier</span>
          </div>
        </div>

        <SidebarContent />
      </aside>

      {/* 2. Mobile Drawer Sidebar (visible on mobile when open) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Sliding Menu Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300 shadow-2xl border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with Close Button */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
                  IM
                </div>
                <div>
                  <span className="font-bold text-white tracking-tight text-base font-['Outfit']">ImmoGestion</span>
                  <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">SaaS Immobilier</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
                title="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <SidebarContent onItemClick={onClose} />
          </div>
        </div>
      )}
    </>
  );
};
