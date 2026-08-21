import React from 'react';
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
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'PILOTAGE',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Rapports & Stats', href: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
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
      { label: 'Impôts & Fiscalité', href: '/taxes', icon: <Scale className="w-4 h-4" /> },
    ],
  },
  {
    title: 'OPÉRATIONS & GED',
    items: [
      { label: 'Maintenance', href: '/maintenance', icon: <Wrench className="w-4 h-4" /> },
      { label: 'Fournisseurs', href: '/suppliers', icon: <Truck className="w-4 h-4" /> },
      { label: 'Documents & GED', href: '/documents', icon: <FolderLock className="w-4 h-4" /> },
      { label: 'Équipe & Collaborateurs', href: '/admin/team', icon: <Users className="w-4 h-4" /> },
      { label: 'Audit & Sécurité', href: '/admin/audit', icon: <ShieldAlert className="w-4 h-4" /> },
    ],
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800">
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

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
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
        <span className="text-[10px] text-slate-500 block mt-0.5">Version 1.0 (Architecture v1.0)</span>
      </div>
    </aside>
  );
};
