import { requireSession } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

export async function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  return <AppShell profile={profile}>{children}</AppShell>;
}
