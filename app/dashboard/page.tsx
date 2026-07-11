import { Building2, CreditCard, Dumbbell, Target, TrendingUp, UserPlus, Users, AlertTriangle, Sparkles, CalendarDays } from 'lucide-react';
import { ProtectedPage } from '@/components/ProtectedPage';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(value || 0));
}

async function AdminDashboard() {
  const supabase = await createClient();
  const [{ count: orgCount }, { data: orgs }, { data: kpis }] = await Promise.all([
    supabase.from('organizations').select('*', { count:'exact', head:true }),
    supabase.from('organizations').select('id,name,plan_name,subscription_status,created_at').order('created_at',{ascending:false}).limit(6),
    supabase.from('organization_kpis').select('*'),
  ]);
  const active = (orgs || []).filter(o => o.subscription_status === 'active').length;
  const members = (kpis || []).reduce((a,k)=>a+Number(k.active_members||0),0);
  const revenue = (kpis || []).reduce((a,k)=>a+Number(k.income_month||0),0);

  return <div className="page">
    <PageHeader title="Central ADM" description="Visão consolidada de todas as academias que utilizam o GYMFIT." />
    <div className="grid grid-4">
      <StatCard label="Academias cadastradas" value={String(orgCount || 0)} foot={`${active} ativas na amostra recente`} icon={Building2}/>
      <StatCard label="Alunos na plataforma" value={String(members)} foot="Base consolidada das academias" icon={Users}/>
      <StatCard label="Receita das unidades" value={money(revenue)} foot="Movimentação paga no mês" icon={TrendingUp}/>
      <StatCard label="Saúde da plataforma" value="99,9%" foot="API operacional" icon={Sparkles}/>
    </div>
    <div className="grid grid-2" style={{marginTop:16}}>
      <section className="card card-pad">
        <div className="section-head"><h2>Academias recentes</h2><span>Últimos cadastros</span></div>
        <div className="table-wrap"><table><thead><tr><th>Academia</th><th>Plano</th><th>Status</th></tr></thead><tbody>{(orgs||[]).map(o=><tr key={o.id}><td><strong>{o.name}</strong></td><td>{o.plan_name}</td><td><StatusBadge status={o.subscription_status}/></td></tr>)}</tbody></table></div>
      </section>
      <section className="card card-pad">
        <div className="section-head"><h2>GYMFIT Copilot</h2><span>Resumo inteligente</span></div>
        <div className="ai-box"><div className="ai-title"><Sparkles size={18}/> Prioridades da plataforma</div><div className="ai-list">
          <div className="ai-item">Revise academias em período de teste que ainda não concluíram a configuração inicial.</div>
          <div className="ai-item">Acompanhe inadimplência por plano e prepare ações de retenção de clientes SaaS.</div>
          <div className="ai-item">Use o comparativo de crescimento para identificar academias com alto potencial de expansão.</div>
        </div></div>
      </section>
    </div>
  </div>;
}

async function OrgDashboard({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  const [{ data: kpi }, { data: leads }, { data: risks }, { data: sessions }] = await Promise.all([
    supabase.from('organization_kpis').select('*').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('leads').select('id,name,stage,source,created_at').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(5),
    supabase.from('churn_scores').select('id,score,risk_level,factors,members(full_name)').eq('organization_id',organizationId).order('score',{ascending:false}).limit(5),
    supabase.from('class_sessions').select('id,title,starts_at,capacity,room').eq('organization_id',organizationId).gte('starts_at',new Date().toISOString()).order('starts_at').limit(5),
  ]);
  const income = Number(kpi?.income_month || 0), expense = Number(kpi?.expense_month || 0);
  return <div className="page">
    <PageHeader title="Visão geral" description="Indicadores, prioridades e movimentações da sua academia em tempo real." />
    <div className="grid grid-4">
      <StatCard label="Alunos ativos" value={String(kpi?.active_members || 0)} foot={`+${kpi?.new_members_month || 0} novos neste mês`} icon={Users}/>
      <StatCard label="Receita do mês" value={money(income)} foot="Receitas já confirmadas" icon={TrendingUp}/>
      <StatCard label="Resultado estimado" value={money(income-expense)} foot={`${money(expense)} em despesas pagas`} icon={CreditCard} tone={income-expense >= 0 ? 'positive':'negative'}/>
      <StatCard label="Inadimplentes" value={String(kpi?.overdue_count || 0)} foot="Cobranças vencidas" icon={AlertTriangle} tone="negative"/>
    </div>
    <section className="card hero" style={{marginTop:16}}>
      <div className="hero-glow"/><div><h2>Sua academia, em uma única visão.</h2><p>O GYMFIT conecta operação, financeiro, vendas, treino e retenção. Os dados desta tela vêm da mesma base usada pelos módulos, evitando informações duplicadas.</p><div className="actions"><a className="btn btn-primary" href="/retencao"><Sparkles size={16}/> Ver prioridades inteligentes</a><a className="btn" href="/relatorios">Abrir BI</a></div></div>
      <div className="ai-box"><div className="ai-title"><Sparkles size={18}/> GYMFIT Copilot</div><div className="ai-list"><div className="ai-item">{Number(kpi?.overdue_count || 0) > 0 ? `${kpi?.overdue_count} cobranças precisam de atenção financeira.` : 'Nenhuma cobrança atrasada identificada no momento.'}</div><div className="ai-item">{kpi?.leads_month || 0} novos leads entraram no funil neste mês.</div><div className="ai-item">Revise alunos com queda de frequência antes do vencimento do plano.</div></div></div>
    </section>
    <div className="grid grid-2" style={{marginTop:16}}>
      <section className="card card-pad"><div className="section-head"><h2>Funil recente</h2><span>CRM</span></div><div className="table-wrap"><table><thead><tr><th>Lead</th><th>Origem</th><th>Etapa</th></tr></thead><tbody>{(leads||[]).map(l=><tr key={l.id}><td>{l.name}</td><td>{l.source || '—'}</td><td><StatusBadge status={l.stage}/></td></tr>)}</tbody></table></div></section>
      <section className="card card-pad"><div className="section-head"><h2>Próximas aulas</h2><span>Agenda</span></div>{(sessions||[]).length ? <div className="timeline">{(sessions||[]).map(s=><div className="timeline-item" key={s.id}><strong>{s.title}</strong><span>{new Date(s.starts_at).toLocaleString('pt-BR')} · {s.room || 'Sala não definida'} · {s.capacity} vagas</span></div>)}</div> : <div className="empty"><CalendarDays/><div>Nenhuma aula futura cadastrada.</div></div>}</section>
    </div>
    <section className="card card-pad" style={{marginTop:16}}><div className="section-head"><h2>Risco de evasão</h2><span>Motor explicável</span></div>{(risks||[]).length ? (risks||[]).map((r:any)=><div className="risk-card" key={r.id}><div className="risk-user"><div className="avatar">{String(r.members?.full_name||'A').slice(0,1)}</div><div><strong>{r.members?.full_name || 'Aluno'}</strong><div className="stat-foot">{r.risk_level}</div></div></div><div className="risk-score">{r.score}%</div></div>) : <div className="empty"><AlertTriangle/><div>O motor de retenção ainda não possui pontuações calculadas.</div></div>}</section>
  </div>;
}

async function StudentDashboard() {
  const { user } = await requireSession();
  const supabase = await createClient();
  const { data: member } = await supabase.from('members').select('id,full_name,organization_id,last_checkin_at').eq('user_id',user.id).maybeSingle();
  const [{ data: workouts }, { data: assessments }, { data: bookings }] = member ? await Promise.all([
    supabase.from('workouts').select('id,name,objective,expires_on').eq('member_id',member.id).eq('status','active').order('created_at',{ascending:false}).limit(3),
    supabase.from('assessments').select('id,assessed_at,weight_kg,body_fat_pct').eq('member_id',member.id).order('assessed_at',{ascending:false}).limit(2),
    supabase.from('class_bookings').select('id,status,class_sessions(title,starts_at)').eq('member_id',member.id).order('created_at',{ascending:false}).limit(4)
  ]) : [{data:[]},{data:[]},{data:[]}];
  return <div className="page"><PageHeader title={`Olá, ${member?.full_name?.split(' ')[0] || 'atleta'} 👋`} description="Seu treino, evolução, aulas e pagamentos em um só lugar."/>
    <div className="grid grid-4"><StatCard label="Treinos ativos" value={String(workouts?.length||0)} foot="Programas disponíveis" icon={Dumbbell}/><StatCard label="Último check-in" value={member?.last_checkin_at ? new Date(member.last_checkin_at).toLocaleDateString('pt-BR') : '—'} foot="Histórico de frequência" icon={CalendarDays}/><StatCard label="Avaliações" value={String(assessments?.length||0)} foot="Registros recentes carregados" icon={Target}/><StatCard label="Reservas recentes" value={String(bookings?.length||0)} foot="Aulas e atividades" icon={UserPlus}/></div>
    <div className="grid grid-2" style={{marginTop:16}}><section className="card card-pad"><div className="section-head"><h2>Meus treinos</h2><span>Performance</span></div>{(workouts||[]).map(w=><div className="risk-card" key={w.id}><div><strong>{w.name}</strong><div className="stat-foot">{w.objective || 'Objetivo personalizado'}</div></div><StatusBadge status="active"/></div>)}</section><section className="card card-pad"><div className="section-head"><h2>Minha evolução</h2><span>Avaliações</span></div>{(assessments||[]).map(a=><div className="risk-card" key={a.id}><div><strong>{new Date(a.assessed_at).toLocaleDateString('pt-BR')}</strong><div className="stat-foot">Avaliação física</div></div><div><strong>{a.weight_kg || '—'} kg</strong><div className="stat-foot">Gordura: {a.body_fat_pct ?? '—'}%</div></div></div>)}</section></div>
  </div>;
}

export default async function DashboardPage() {
  const { profile } = await requireSession();
  let content: React.ReactNode;
  if (profile.role === 'platform_admin') content = await AdminDashboard();
  else if (profile.role === 'student') content = await StudentDashboard();
  else content = profile.organization_id ? await OrgDashboard({organizationId:profile.organization_id}) : <div className="page"><PageHeader title="Configuração pendente" description="Seu usuário ainda não está vinculado a uma academia."/></div>;
  return <ProtectedPage>{content}</ProtectedPage>;
}
