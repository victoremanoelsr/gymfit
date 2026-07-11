import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export const requireSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,role,organization_id,avatar_url,must_change_password,status')
    .eq('id', user.id)
    .single();

  if (error || !profile) redirect('/login?error=perfil');
  return { user, profile: profile as Profile };
});
