import NavHeader from '@/components/portal/nav-header';
import { getCandidatoAtual } from '@/lib/auth/get-candidato-atual';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const candidato = await getCandidatoAtual();
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <NavHeader statusDocumentos={candidato.statusDocumentos} />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
