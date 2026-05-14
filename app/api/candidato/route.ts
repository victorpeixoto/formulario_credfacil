import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { sanitizarECriarUpdate } from '@/lib/candidato';
import { STATUS_EDICAO_BLOQUEADO } from '@/types/candidato';
import type { TipoDocumento, StatusDocumentos } from '@/types/documentos';

const TIPOS: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];

function mascararCPF(cpf: string): string {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return '***.***.***-**';
  return `${limpo.slice(0, 3)}.***.**${limpo.slice(8, 9)}-${limpo.slice(9)}`;
}

async function autenticar() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;
  return payload;
}

interface CandidatoDoc {
  nomeCompleto?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estadoUF?: string;
  statusDocumentos?: StatusDocumentos;
  documentos?: Record<string, { status?: string; tentativas?: number; resultado?: { motivo?: string | null } }>;
}

function montarResponse(candidato: CandidatoDoc) {
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

  return {
    nomeCompleto: candidato.nomeCompleto ?? '',
    cpf: mascararCPF(candidato.cpf ?? ''),
    email: candidato.email ?? '',
    telefone: candidato.telefone ?? '',
    endereco: {
      cep: candidato.cep ?? '',
      logradouro: candidato.logradouro ?? '',
      numero: candidato.numero ?? '',
      complemento: candidato.complemento ?? '',
      bairro: candidato.bairro ?? '',
      cidade: candidato.cidade ?? '',
      estadoUF: candidato.estadoUF ?? '',
    },
    statusDocumentos: (candidato.statusDocumentos as StatusDocumentos) ?? 'AGUARDANDO_DOCUMENTOS',
    documentos,
  };
}

export async function GET() {
  const payload = await autenticar();
  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('credfacil');
    const candidato = await db
      .collection<CandidatoDoc>('conversations')
      .findOne({ formCode: payload.formCode });

    if (!candidato) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    return NextResponse.json(montarResponse(candidato));
  } catch (err) {
    console.error('[candidato GET] Erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const payload = await autenticar();
  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { campos, erro } = sanitizarECriarUpdate(body);
  if (erro) {
    return NextResponse.json({ error: erro.mensagem, campo: erro.campo }, { status: 400 });
  }
  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('credfacil');
    const col = db.collection<CandidatoDoc>('conversations');

    const atual = await col.findOne(
      { formCode: payload.formCode },
      { projection: { statusDocumentos: 1 } }
    );

    if (!atual) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    const status = atual.statusDocumentos as StatusDocumentos | undefined;
    if (status && STATUS_EDICAO_BLOQUEADO.includes(status)) {
      return NextResponse.json(
        { error: 'Seu cadastro já está em fase final. Para alterar, fale com o suporte.' },
        { status: 409 }
      );
    }

    await col.updateOne(
      { formCode: payload.formCode },
      { $set: { ...campos, updatedAt: new Date() } }
    );

    const atualizado = await col.findOne({ formCode: payload.formCode });
    if (!atualizado) {
      return NextResponse.json({ error: 'Candidato não encontrado após update' }, { status: 500 });
    }

    return NextResponse.json(montarResponse(atualizado));
  } catch (err) {
    console.error('[candidato PATCH] Erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
