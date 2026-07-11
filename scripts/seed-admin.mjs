import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('ERRO: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY antes de executar.');
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const email = 'victor@gymfit.local';
const password = process.env.GYMFIT_ADMIN_PASSWORD;
if (!password) {
  console.error('ERRO: defina GYMFIT_ADMIN_PASSWORD para criar ou sincronizar o ADM.');
  process.exit(1);
}
const metadata = {
  username: 'Victor',
  display_name: 'Victor',
  role: 'platform_admin',
  organization_id: null,
  must_change_password: false,
};

async function findUserByEmail() {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

try {
  let user = await findUserByEmail();
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    user = data.user;
    console.log('ADM Victor criado com sucesso.');
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    console.log('ADM Victor já existia; senha e metadados foram sincronizados.');
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    username: 'Victor',
    display_name: 'Victor',
    role: 'platform_admin',
    organization_id: null,
    must_change_password: false,
    status: 'active',
  });
  if (profileError) throw profileError;
  console.log('Perfil ADM confirmado. Login: Victor');
} catch (error) {
  console.error('Falha ao criar o ADM:', error.message || error);
  process.exit(1);
}
