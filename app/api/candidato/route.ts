import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import type { TipoDocumento, StatusDocumentos } from '@/types/documentos';

const TIPOS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];

function mascararCPF(cpf: string): string {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return '***.***.***-**';
  return `${limpo.slice(0, 3)}.***.**${limpo.slice(8, 9)}-${limpo.slice(9)}`;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('credfacil');
    const candidato = await db.collection('conversations').findOne({ formCode: payload.formCode });

    if (!candidato) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    const docs = candidato.documentos ?? {};
    const documentos: Record<string, { status: string; motivo: string | null; tentativas: number }> = {};

    for (const tipo of TIPOS) {
      const doc = docs[tipo];
      documentos[tipo] = {
        status: doc?.status ?? 'pendente',
        motivo: doc?.resultado?.motivo ?? null,
        tentativas: doc?.tentativas ?? 0,
      };
    }

    return NextResponse.json({
      nomeCompleto: candidato.nomeCompleto ?? '',
      cpf: mascararCPF(candidato.cpf ?? ''),
      statusDocumentos: (candidato.statusDocumentos as StatusDocumentos) ?? 'AGUARDANDO_DOCUMENTOS',
      documentos,
    });
  } catch (err) {
    console.error('[candidato] Erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
