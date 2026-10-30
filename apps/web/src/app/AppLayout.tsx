import type { Role } from '@banana/api-client';
import {
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { ROLE_LABELS } from '@/shared/lib/labels';

interface NavItem {
  to: string;
  label: string;
  icon: typeof ClipboardList;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { to: '/reports', label: 'Mis reportes', icon: ClipboardList, roles: ['USUARIO'] },
  { to: '/reports/new', label: 'Nuevo reporte', icon: PlusCircle, roles: ['USUARIO', 'ADMIN'] },
  { to: '/history', label: 'Historial general', icon: ClipboardList, roles: ['ADMIN'] },
  { to: '/inbox', label: 'Mi bandeja', icon: Inbox, roles: ['TECNICO'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.rol));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navigation = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/reports'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-banana-100 text-banana-900'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink-900 p-5 text-white lg:flex">
        <div className="mb-9 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-banana-400 text-xl">
            🍌
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Banana Escolar</p>
            <p className="text-[11px] text-slate-400">Gestión de incidencias</p>
          </div>
        </div>
        {navigation}
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="truncate text-sm font-medium text-white">{user.nombre}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.rol]}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍌</span>
          <p className="text-sm font-bold text-slate-900">Banana Escolar</p>
        </div>
        <button
          type="button"
          className="btn-ghost p-2"
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative flex h-full w-72 flex-col bg-ink-900 p-5 text-white shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍌</span>
                <p className="text-sm font-bold">Banana Escolar</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            {navigation}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-slate-300"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
