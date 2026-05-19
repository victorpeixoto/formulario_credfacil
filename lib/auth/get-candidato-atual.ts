import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verificarJWT } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import type { StatusDocumentos } from '@/types/documentos';

export interface CandidatoAtual {
  nomeCompleto: string;
  cpf: string;
  statusDocumentos: StatusDocumentos;
}

export async function getCandidatoAtual(): Promise<CandidatoAtual> {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    redirect('/login');
  }

  const client = await clientPromise;
  const candidato = await client
    .db('credfacil')
    .collection<{ nomeCompleto?: string; cpf?: string; statusDocumentos?: StatusDocumentos }>('conversations')
    .findOne(
      { formCode: payload.formCode },
      { projection: { nomeCompleto: 1, cpf: 1, statusDocumentos: 1 } }
    );

  if (!candidato) {
    redirect('/login');
  }

  return {
    nomeCompleto: candidato.nomeCompleto ?? '',
    cpf: candidato.cpf ?? '',
    statusDocumentos: candidato.statusDocumentos ?? 'AGUARDANDO_DOCUMENTOS',
  };
}
