import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function assertPlatformAdmin() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data:profile } = await supabase.from('profiles').select('role').eq('id',user.id).single();
  return profile?.role === 'platform_admin' ? user : null;
}

export async function POST(request: Request) {
  try {
    const actor = await assertPlatformAdmin();
    if (!actor) return NextResponse.json({ error:'Não autorizado.' },{status:403});
    const body = await request.json();
    const { academy, master } = body;
    if (!academy?.name || !academy?.slug || !master?.username || !master?.password || !master?.display_name) {
      return NextResponse.json({ error:'Preencha academia, slug, nome do Master, usuário e senha.' },{status:400});
    }
    if (String(master.password).length < 8) return NextResponse.json({ error:'A senha do Master precisa ter pelo menos 8 caracteres.' },{status:400});

    const admin = createAdminClient();
    const { data:org, error:orgError } = await admin.from('organizations').insert({
      name: academy.name,
      slug: academy.slug,
      email: academy.email || null,
      phone: academy.phone || null,
      plan_name: academy.plan_name || 'Start',
      subscription_status: academy.subscription_status || 'active',
      max_members: Number(academy.max_members || 300),
      max_branches: Number(academy.max_branches || 1),
    }).select('id,name').single();
    if (orgError || !org) return NextResponse.json({ error:orgError?.message || 'Erro ao criar academia.' },{status:400});

    const email = `${String(master.username).trim().toLowerCase()}@gymfit.local`;
    const { data:userData, error:userError } = await admin.auth.admin.createUser({
      email,
      password: master.password,
      email_confirm: true,
      user_metadata: {
        username: String(master.username).trim(),
        display_name: String(master.display_name).trim(),
        role: 'master',
        organization_id: org.id,
        must_change_password: true,
      },
    });

    if (userError || !userData.user) {
      await admin.from('organizations').delete().eq('id',org.id);
      return NextResponse.json({ error:userError?.message || 'Erro ao criar usuário Master.' },{status:400});
    }

    await admin.from('audit_logs').insert({ actor_id:actor.id, organization_id:org.id, action:'CREATE_ACADEMY', entity_type:'organization', entity_id:org.id, metadata:{ master_username:master.username } });
    return NextResponse.json({ ok:true, organization:org, master_user_id:userData.user.id });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : 'Erro inesperado.' },{status:500});
  }
}
