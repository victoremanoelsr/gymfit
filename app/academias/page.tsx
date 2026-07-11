import { ProtectedPage } from '@/components/ProtectedPage';
import { PageHeader } from '@/components/PageHeader';
import { AcademyManager } from '@/components/AcademyManager';
import { requireSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AcademiasPage(){const {profile}=await requireSession();if(profile.role!=='platform_admin')redirect('/dashboard');return <ProtectedPage><div className="page"><PageHeader title="Academias" description="Crie academias clientes, defina limites e gere automaticamente o acesso Master do proprietário."/><AcademyManager/></div></ProtectedPage>}
