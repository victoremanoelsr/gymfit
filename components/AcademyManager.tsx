'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';

export function AcademyManager() {
  const supabase=useMemo(()=>createClient(),[]);
  const [rows,setRows]=useState<any[]>([]), [loading,setLoading]=useState(true), [search,setSearch]=useState(''), [modal,setModal]=useState(false), [error,setError]=useState(''), [saving,setSaving]=useState(false), [toast,setToast]=useState('');
  const [form,setForm]=useState<any>({plan_name:'Start',subscription_status:'active',max_members:300,max_branches:1});
  const load=useCallback(async()=>{setLoading(true);const {data,error}=await supabase.from('organizations').select('*').order('created_at',{ascending:false});if(error)setError(error.message);else setRows(data||[]);setLoading(false)},[supabase]);
  useEffect(()=>{void load()},[load]); useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2500);return()=>clearTimeout(t)}},[toast]);
  const filtered=rows.filter(r=>`${r.name} ${r.slug} ${r.plan_name}`.toLowerCase().includes(search.toLowerCase()));
  function set(k:string,v:any){setForm((f:any)=>({...f,[k]:v}));}
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{const res=await fetch('/api/admin/academies',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({academy:{name:form.name,slug:form.slug,email:form.email,phone:form.phone,plan_name:form.plan_name,subscription_status:form.subscription_status,max_members:form.max_members,max_branches:form.max_branches},master:{display_name:form.master_name,username:form.master_username,password:form.master_password}})});const json=await res.json();if(!res.ok)throw new Error(json.error||'Erro ao criar academia.');setModal(false);setForm({plan_name:'Start',subscription_status:'active',max_members:300,max_branches:1});setToast('Academia e usuário Master criados.');await load()}catch(err){setError(err instanceof Error?err.message:'Erro inesperado.')}finally{setSaving(false)}}
  return <>
    <div className="toolbar"><label className="search-box" style={{width:320}}><Search size={16}/><input placeholder="Buscar academia..." value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="btn btn-primary" onClick={()=>{setError('');setModal(true)}}><Plus size={16}/>Nova academia</button></div>
    {error&&!modal&&<div className="error-box">{error}</div>}
    <div className="card table-wrap">{loading?<div className="empty">Carregando...</div>:filtered.length===0?<div className="empty"><Building2/><div>Nenhuma academia cadastrada.</div></div>:<table><thead><tr><th>Academia</th><th>Slug</th><th>Plano</th><th>Limite alunos</th><th>Unidades</th><th>Status</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.name}</strong><div className="stat-foot">{r.email||'Sem e-mail'}</div></td><td>{r.slug}</td><td>{r.plan_name}</td><td>{r.max_members}</td><td>{r.max_branches}</td><td><StatusBadge status={r.subscription_status}/></td></tr>)}</tbody></table>}</div>
    {modal&&<div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><h3>Criar academia + painel Master</h3><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={17}/></button></div><div className="modal-body">{error&&<div className="error-box">{error}</div>}<div className="form-grid">
      <div className="form-field"><label>Nome da academia</label><input className="input" required value={form.name||''} onChange={e=>set('name',e.target.value)}/></div>
      <div className="form-field"><label>Slug</label><input className="input" required placeholder="academia-centro" value={form.slug||''} onChange={e=>set('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))}/></div>
      <div className="form-field"><label>E-mail</label><input className="input" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
      <div className="form-field"><label>Telefone</label><input className="input" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
      <div className="form-field"><label>Plano</label><select className="select" value={form.plan_name} onChange={e=>set('plan_name',e.target.value)}><option>Start</option><option>Pro</option><option>Network</option></select></div>
      <div className="form-field"><label>Status</label><select className="select" value={form.subscription_status} onChange={e=>set('subscription_status',e.target.value)}><option value="active">Ativa</option><option value="pending">Pendente</option><option value="blocked">Bloqueada</option></select></div>
      <div className="form-field"><label>Limite de alunos</label><input className="input" type="number" min="1" value={form.max_members} onChange={e=>set('max_members',Number(e.target.value))}/></div>
      <div className="form-field"><label>Limite de unidades</label><input className="input" type="number" min="1" value={form.max_branches} onChange={e=>set('max_branches',Number(e.target.value))}/></div>
      <div className="form-field full" style={{borderTop:'1px solid var(--line)',paddingTop:14,marginTop:4}}><strong>Proprietário / Master da academia</strong></div>
      <div className="form-field"><label>Nome do Master</label><input className="input" required value={form.master_name||''} onChange={e=>set('master_name',e.target.value)}/></div>
      <div className="form-field"><label>Usuário do Master</label><input className="input" required value={form.master_username||''} onChange={e=>set('master_username',e.target.value)}/></div>
      <div className="form-field full"><label>Senha inicial</label><input className="input" type="password" minLength={8} required value={form.master_password||''} onChange={e=>set('master_password',e.target.value)}/></div>
    </div></div><div className="modal-footer"><button type="button" className="btn" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" disabled={saving}>{saving?'Criando...':'Criar academia e Master'}</button></div></form></div>}
    {toast&&<div className="toast">{toast}</div>}
  </>;
}
