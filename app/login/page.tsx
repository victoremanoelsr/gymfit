'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, LockKeyhole, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';

function usernameToEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('@')) return normalized;
  return `${normalized}@gymfit.local`;
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (authError) throw authError;
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Usuário ou senha incorretos. Verifique os dados e tente novamente.');
    } finally { setLoading(false); }
  }

  return <div className="login-page">
    <section className="login-visual">
      <Logo />
      <div className="login-copy">
        <h1>O sistema que <span>move</span> sua academia.</h1>
        <p>Gestão, vendas, financeiro, treinos, retenção e inteligência em uma única plataforma.</p>
      </div>
      <div className="login-tags"><span className="login-tag">MULTIUNIDADE</span><span className="login-tag">CRM</span><span className="login-tag">TREINOS</span><span className="login-tag">RETENÇÃO IA</span><span className="login-tag">SMART GYM</span></div>
    </section>
    <section className="login-form-side">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <h2>Bem-vindo de volta</h2><p>Acesse o painel GYMFIT.</p>
        {error && <div className="error-box">{error}</div>}
        <div className="form-field"><label>Usuário</label><div style={{position:'relative'}}><UserRound size={17} style={{position:'absolute',left:12,top:12,color:'#6f8074'}}/><input className="input" style={{paddingLeft:38}} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Seu usuário" autoComplete="username" required /></div></div>
        <div className="form-field"><label>Senha</label><div style={{position:'relative'}}><LockKeyhole size={17} style={{position:'absolute',left:12,top:12,color:'#6f8074'}}/><input className="input" style={{paddingLeft:38}} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required /></div></div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Entrando...' : <><Dumbbell size={17}/> Entrar no GYMFIT</>}</button>
        <div className="login-note">Acesso protegido por autenticação Supabase e políticas de segurança por perfil e academia.</div>
      </form>
    </section>
  </div>;
}
