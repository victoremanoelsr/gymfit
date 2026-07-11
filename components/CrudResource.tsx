'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';

export type CrudField = {
  name: string;
  label: string;
  type?: 'text'|'email'|'tel'|'number'|'date'|'datetime-local'|'textarea'|'select';
  required?: boolean;
  options?: { label:string; value:string }[];
  placeholder?: string;
  step?: string;
  defaultValue?: string | number;
};

export type CrudColumn = {
  key: string;
  label: string;
  format?: 'money'|'date'|'datetime'|'status'|'boolean';
};

function getValue(row: Record<string, any>, key: string): unknown {
  return key.split('.').reduce((acc:any, part) => acc == null ? undefined : acc[part], row);
}

function formatCell(value: unknown, format?: CrudColumn['format']) {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'money') return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
  if (format === 'date') return new Date(String(value) + (String(value).length===10?'T12:00:00':'')).toLocaleDateString('pt-BR');
  if (format === 'datetime') return new Date(String(value)).toLocaleString('pt-BR');
  if (format === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

export function CrudResource({
  table, organizationId, columns, fields, searchFields, addLabel='Novo registro', emptyText='Nenhum registro encontrado.', fixedValues={}, filter={}, orderBy='created_at', orderAscending=false, select='*', readOnly=false,
}: {
  table:string;
  organizationId?:string | null;
  columns:CrudColumn[];
  fields:CrudField[];
  searchFields:string[];
  addLabel?:string;
  emptyText?:string;
  fixedValues?:Record<string,unknown>;
  filter?:Record<string,string>;
  orderBy?:string;
  orderAscending?:boolean;
  select?:string;
  readOnly?:boolean;
}) {
  const [rows,setRows]=useState<Record<string,any>[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<Record<string,any>|null>(null);
  const [form,setForm]=useState<Record<string,any>>({});
  const [error,setError]=useState('');
  const [toast,setToast]=useState('');
  const supabase=useMemo(()=>createClient(),[]);
  const filterKey=JSON.stringify(filter);
  const filterEntries=useMemo(()=>Object.entries(JSON.parse(filterKey) as Record<string,string>),[filterKey]);

  const load=useCallback(async()=>{
    setLoading(true); setError('');
    let query=supabase.from(table).select(select).order(orderBy,{ascending:orderAscending}).limit(500);
    if(organizationId) query=query.eq('organization_id',organizationId);
    filterEntries.forEach(([key,value])=>{ query=query.eq(key,value); });
    const {data,error}=await query;
    if(error) setError(error.message); else setRows(data||[]);
    setLoading(false);
  },[supabase,table,organizationId,orderBy,orderAscending,select,filterEntries]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)}},[toast]);

  const filtered=rows.filter(row=>{
    const q=search.trim().toLowerCase(); if(!q) return true;
    return searchFields.some(k=>String(getValue(row,k)??'').toLowerCase().includes(q));
  });

  function openNew(){
    const initial:Record<string,any>={};
    fields.forEach(f=>{ if(f.defaultValue!==undefined) initial[f.name]=f.defaultValue; });
    setForm(initial);setEditing(null);setError('');setModal(true);
  }
  function openEdit(row:Record<string,any>){setForm({...row});setEditing(row);setError('');setModal(true);}

  async function save(e:React.FormEvent){
    e.preventDefault(); setError('');
    const payload:Record<string,any>={...fixedValues};
    fields.forEach(f => { payload[f.name] = form[f.name]; });
    Object.keys(payload).forEach(k=>{ if(payload[k]==='') payload[k]=null; });
    if(organizationId) payload.organization_id=organizationId;
    let result;
    if(editing) result=await supabase.from(table).update(payload).eq('id',editing.id);
    else result=await supabase.from(table).insert(payload);
    if(result.error){setError(result.error.message);return;}
    setModal(false);setToast(editing?'Registro atualizado.':'Registro criado.');await load();
  }

  async function remove(row:Record<string,any>){
    if(!confirm('Tem certeza que deseja excluir este registro?')) return;
    const {error}=await supabase.from(table).delete().eq('id',row.id);
    if(error){setError(error.message);return;} setToast('Registro excluído.');await load();
  }

  return <>
    <div className="toolbar">
      <div className="filter-row"><label className="search-box" style={{width:300}}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."/></label><button className="btn btn-ghost btn-sm" onClick={()=>void load()}><RefreshCw size={14}/> Atualizar</button></div>
      {!readOnly && <button className="btn btn-primary" onClick={openNew}><Plus size={16}/>{addLabel}</button>}
    </div>
    {error && !modal && <div className="error-box">{error}</div>}
    <div className="card table-wrap">
      {loading ? <div className="empty">Carregando dados...</div> : filtered.length===0 ? <div className="empty">{emptyText}</div> : <table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}{!readOnly && <th>Ações</th>}</tr></thead><tbody>{filtered.map(row=><tr key={row.id}>{columns.map(c=><td key={c.key}>{c.format==='status'?<StatusBadge status={String(getValue(row,c.key)||'pending')}/>:formatCell(getValue(row,c.key),c.format)}</td>)}{!readOnly && <td><div className="actions"><button className="icon-btn" onClick={()=>openEdit(row)} aria-label="Editar"><Edit3 size={15}/></button><button className="icon-btn" onClick={()=>void remove(row)} aria-label="Excluir"><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>}
    </div>
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={save}><div className="modal-head"><h3>{editing?'Editar registro':addLabel}</h3><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={17}/></button></div><div className="modal-body">{error&&<div className="error-box">{error}</div>}<div className="form-grid">{fields.map(f=><div key={f.name} className={`form-field ${f.type==='textarea'?'full':''}`}><label>{f.label}</label>{f.type==='textarea'?<textarea className="textarea" rows={4} required={f.required} value={form[f.name]??''} onChange={e=>setForm({...form,[f.name]:e.target.value})} placeholder={f.placeholder}/>:f.type==='select'?<select className="select" required={f.required} value={form[f.name]??''} onChange={e=>setForm({...form,[f.name]:e.target.value})}><option value="">Selecione</option>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input className="input" type={f.type||'text'} required={f.required} step={f.step} value={form[f.name]??''} onChange={e=>setForm({...form,[f.name]:f.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value})} placeholder={f.placeholder}/>}</div>)}</div></div><div className="modal-footer"><button type="button" className="btn" onClick={()=>setModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit">{editing?'Salvar alterações':'Criar registro'}</button></div></form></div>}
    {toast&&<div className="toast">{toast}</div>}
  </>;
}
