import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request:Request){
  try{
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Não autenticado.'},{status:401});
    const {data:actor}=await supabase.from('profiles').select('role,organization_id').eq('id',user.id).single(); if(!actor)return NextResponse.json({error:'Perfil não encontrado.'},{status:403});
    const body=await request.json(); const username=String(body.username||'').trim(); const password=String(body.password||''); const displayName=String(body.display_name||'').trim(); const role=String(body.role||'');
    const allowedByRole:Record<string,string[]>={platform_admin:['platform_admin','master','manager','trainer','student'],master:['manager','trainer','student'],manager:['trainer','student']};
    if(!allowedByRole[actor.role]?.includes(role))return NextResponse.json({error:'Seu perfil não pode criar este tipo de acesso.'},{status:403});
    if(!username||!displayName||password.length<8)return NextResponse.json({error:'Informe nome, usuário e senha com pelo menos 8 caracteres.'},{status:400});
    const organizationId=actor.role==='platform_admin'?(body.organization_id||null):actor.organization_id;
    if(role!=='platform_admin'&&!organizationId)return NextResponse.json({error:'É necessário vincular o usuário a uma academia.'},{status:400});
    const admin=createAdminClient(); const email=`${username.toLowerCase()}@gymfit.local`;
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,display_name:displayName,role,organization_id:organizationId,must_change_password:true}});
    if(error||!data.user)return NextResponse.json({error:error?.message||'Erro ao criar usuário.'},{status:400});
    if(role==='student'&&body.member_id){const {error:linkError}=await admin.from('members').update({user_id:data.user.id}).eq('id',body.member_id).eq('organization_id',organizationId);if(linkError){await admin.auth.admin.deleteUser(data.user.id);return NextResponse.json({error:'Falha ao vincular o aluno: '+linkError.message},{status:400});}}
    await admin.from('audit_logs').insert({actor_id:user.id,organization_id:organizationId,action:'CREATE_USER',entity_type:'profile',entity_id:data.user.id,metadata:{username,role}});
    return NextResponse.json({ok:true,user_id:data.user.id});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Erro inesperado.'},{status:500});}
}
