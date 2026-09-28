import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronsLeft, ChevronsRight, KeyRound, LayoutDashboard, LogOut, Menu as MenuIcon, Moon, Search, Settings, Sun, Users } from 'lucide-react';
import { Avatar, Button, Menu, Input, Modal, Field } from '@/components/ui';
import { useAuth, useCan } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useBootstrap } from '@/store/bootstrap';
import { cn, ROLE_LABEL } from '@/lib/utils';
import { api, errorMessage } from '@/lib/api';
import { toast } from 'sonner';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { to: '/leads', label: 'Leads', icon: Users, perm: 'lead.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'report.view_own' },
  { to: '/admin', label: 'Admin', icon: Settings, perm: 'admin.settings,admin.users,admin.teams,admin.permissions,admin.pipeline,admin.fields,admin.templates,admin.assignment_rules,admin.imports,lead.import' },
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lead-crm-sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);
  useEffect(() => { localStorage.setItem('lead-crm-sidebar', collapsed ? '1' : '0'); }, [collapsed]);
  const can = useCan();
  const { boot } = useBootstrap();
  const items = NAV.filter((n) => !n.perm || can(...n.perm.split(',')));

  return (
    <div className="min-h-screen flex">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn('fixed md:sticky top-0 z-40 h-screen shrink-0 flex flex-col bg-surface border-r border-line transition-[width,transform] duration-200', collapsed ? 'md:w-[60px]' : 'md:w-[224px]', 'w-[240px]', mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className={cn('h-14 flex items-center gap-2.5 px-3.5 border-b border-line', collapsed && 'md:justify-center md:px-0')}>
          <span className="h-8 w-8 rounded-md bg-primary text-white grid place-items-center font-bold shrink-0">{(boot.org?.name ?? 'L')[0]}</span>
          {!collapsed && <div className="min-w-0"><p className="font-semibold truncate leading-5">{boot.org?.name ?? 'Lead CRM'}</p><p className="text-[11.5px] text-ink-3 leading-4">Lead management</p></div>}
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label} className={({ isActive }) => cn('flex items-center gap-2.5 h-9 px-2.5 rounded-md text-[13.5px] transition-colors', isActive ? 'bg-primary-soft text-primary font-medium' : 'text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'md:justify-center md:px-0')}>
              <n.icon size={17} strokeWidth={1.9} className="shrink-0" />{!collapsed && <span>{n.label}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setCollapsed((c) => !c)} className="hidden md:flex h-10 items-center justify-center text-ink-3 hover:text-ink border-t border-line" aria-label="Toggle sidebar">{collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}</button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const user = useAuth((s) => s.user)!;
  const logout = useAuth((s) => s.logout);
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [pw, setPw] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) { nav(`/leads?search=${encodeURIComponent(q.trim())}`); setQ(''); } };
  return (
    <header className="h-14 sticky top-0 z-20 bg-bg/85 backdrop-blur border-b border-line flex items-center gap-3 px-4 md:px-6">
      <button className="md:hidden text-ink-2" onClick={onMenu} aria-label="Open menu"><MenuIcon size={20} /></button>
      <form onSubmit={submit} className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads by name, phone or email" className="pl-8 h-8 text-[13px]" />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</Button>
        <Menu align="right" trigger={() => (
          <button className="flex items-center gap-2 pl-1.5 pr-2 h-9 rounded-md hover:bg-surface-2">
            <Avatar name={user.name} color={user.avatarColor} size={26} />
            <span className="hidden sm:block text-left leading-tight"><span className="block text-[13px] font-medium">{user.name}</span><span className="block text-[11px] text-ink-3">{ROLE_LABEL[user.role]}</span></span>
          </button>)}>
          {(close) => <>
            <div className="px-3 py-2 border-b border-line"><p className="text-[13px] font-medium">{user.name}</p><p className="text-[12px] text-ink-3 truncate">{user.email}</p></div>
            <button className="menu-item" onClick={() => { close(); setPw(true); }}><KeyRound size={14} /> Change password</button>
            <button className="menu-item text-danger" onClick={() => { close(); logout(); }}><LogOut size={14} /> Sign out</button>
          </>}
        </Menu>
      </div>
      <ChangePasswordModal open={pw} onClose={() => setPw(false)} />
    </header>
  );
}

export function ChangePasswordModal({ open, onClose, forced }: { open: boolean; onClose: () => void; forced?: boolean }) {
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [busy, setBusy] = useState(false);
  const setUser = useAuth((s) => s.setUser); const user = useAuth((s) => s.user);
  const submit = async () => {
    if (next.length < 8) return toast.error('New password must be at least 8 characters');
    setBusy(true);
    try { await api.post('/auth/change-password', { currentPassword: cur, newPassword: next }); toast.success('Password changed'); if (user) setUser({ ...user, mustChangePassword: false }); setCur(''); setNext(''); onClose(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={forced ? () => undefined : onClose} title={forced ? 'Set a new password' : 'Change password'} description={forced ? 'Your admin created this account with a temporary password.' : undefined} width="max-w-sm"
      footer={<>{!forced && <Button onClick={onClose}>Cancel</Button>}<Button variant="primary" loading={busy} onClick={submit}>Save password</Button></>}>
      <div className="space-y-3">
        <Field label="Current password"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}
