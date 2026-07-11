import { UserPlus } from 'lucide-react';
import { ProtectedPage } from '@/components/ProtectedPage';
import { PageHeader } from '@/components/PageHeader';
import { CrudResource } from '@/components/CrudResource';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AlunosPage(){
  const {profile}=await requireSession(); const supabase=await createClient();
  let q=supabase.from('branches').select('id,name').order('name'); if(profile.organization_id) q=q.eq('organization_id',profile.organization_id); const {data:branches}=await q;
  return <ProtectedPage><div className="page"><PageHeader title="Alunos" description="Cadastro, vínculo com unidade, situação do aluno e dados essenciais para toda a jornada." actions={<span className="badge badge-green"><UserPlus size={13}/> Jornada única do aluno</span>}/><CrudResource table="members" organizationId={profile.organization_id} select="*,branches(name)" orderBy="created_at" searchFields={['full_name','cpf','email','phone']} addLabel="Novo aluno" emptyText="Nenhum aluno cadastrado." columns={[{key:'full_name',label:'Aluno'},{key:'phone',label:'Telefone'},{key:'branches.name',label:'Unidade'},{key:'joined_at',label:'Entrada',format:'date'},{key:'status',label:'Status',format:'status'}]} fields={[{name:'full_name',label:'Nome completo',required:true},{name:'cpf',label:'CPF'},{name:'email',label:'E-mail',type:'email'},{name:'phone',label:'Telefone',type:'tel'},{name:'birth_date',label:'Nascimento',type:'date'},{name:'branch_id',label:'Unidade',type:'select',options:(branches||[]).map(b=>({label:b.name,value:b.id}))},{name:'joined_at',label:'Data de entrada',type:'date',defaultValue:new Date().toISOString().slice(0,10)},{name:'status',label:'Status',type:'select',required:true,defaultValue:'active',options:[{label:'Ativo',value:'active'},{label:'Inativo',value:'inactive'},{label:'Pendente',value:'pending'},{label:'Bloqueado',value:'blocked'}]},{name:'emergency_contact',label:'Contato de emergência'},{name:'medical_notes',label:'Observações importantes',type:'textarea'}]}/></div></ProtectedPage>;
}
