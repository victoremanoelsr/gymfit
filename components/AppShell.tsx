'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Activity, BarChart3, Bot, Building2, CalendarDays, ClipboardList, CreditCard,
  Dumbbell, Gauge, HeartPulse, LayoutDashboard, LogOut, Megaphone, Menu, Package,
  Search, Settings, ShieldCheck, Sparkles, Target, Users, UserRound, Wrench, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AppRole, Profile } from '@/lib/types';
import { Logo } from '@/components/Logo';

const nav = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, roles: ['platform_admin','master','manager','trainer','student'] },
  { href: '/academias', label: 'Academias', icon: Building2, roles: ['platform_admin'] },
  { href: '/alunos', label: 'Alunos', icon: Users, roles: ['master','manager','trainer'] },
  { href: '/financeiro', label: 'Financeiro', icon: CreditCard, roles: ['master','manager','student'] },
  { href: '/contratos', label: 'Planos & Contratos', icon: ClipboardList, roles: ['master','manager','student'] },
  { href: '/crm', label: 'CRM & Vendas', icon: Target, roles: ['master','manager'] },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, roles: ['master','manager','trainer','student'] },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell, roles: ['master','manager','trainer','student'] },
  { href: '/avaliacoes', label: 'Avaliações', icon: HeartPulse, roles: ['master','manager','trainer','student'] },
  { href: '/acesso', label: 'Controle de acesso', icon: ShieldCheck, roles: ['master','manager'] },
  { href: '/funcionarios', label: 'Equipe', icon: UserRound, roles: ['master','manager'] },
  { href: '/estoque', label: 'PDV & Estoque', icon: Package, roles: ['master','manager'] },
  { href: '/marketing', label: 'Marketing', icon: Megaphone, roles: ['master','manager'] },
  { href: '/gamificacao', label: 'Gamificação', icon: Gauge, roles: ['master','manager','trainer','student'] },
  { href: '/bem-estar', label: 'Bem-estar', icon: HeartPulse, roles: ['master','manager','trainer','student'] },
  { href: '/comunidade', label: 'Comunidade', icon: Users, roles: ['master','manager','trainer','student'] },
  { href: '/experiencia', label: 'NPS & Experiência', icon: Sparkles, roles: ['master','manager','student'] },
  { href: '/retencao', label: 'Retenção IA', icon: Bot, roles: ['master','manager','trainer'] },
  { href: '/relatorios', label: 'BI & Relatórios', icon: BarChart3, roles: ['platform_admin','master','manager'] },
  { href: '/smart-gym', label: 'Smart Gym', icon: Activity, roles: ['master','manager','trainer'] },
  { href: '/integracoes', label: 'Integrações', icon: Wrench, roles: ['master','manager'] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['platform_admin','master','manager'] },
] as const;

function roleLabel(role: AppRole) {
  return ({ platform_admin: 'ADM da plataforma', master: 'Master', manager: 'Gerente', trainer: 'Treinador', student: 'Aluno' })[role];
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const visible = nav.filter(item => (item.roles as readonly string[]).includes(profile.role));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Logo />
        <div className="nav-section">Operação</div>
        <nav>
          {visible.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon />{item.label}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link" onClick={logout} style={{width:'100%',border:0,background:'transparent'}}><LogOut />Sair</button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-btn" onClick={() => setOpen(v => !v)} aria-label="Abrir menu">{open ? <X/> : <Menu/>}</button>
            <label className="search-box"><Search size={17}/><input placeholder="Buscar aluno, lead, pagamento..." aria-label="Busca global" /></label>
          </div>
          <div className="user-chip">
            <div className="avatar">{profile.display_name.slice(0,1).toUpperCase()}</div>
            <div className="user-meta"><strong>{profile.display_name}</strong><span>{roleLabel(profile.role)}</span></div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
