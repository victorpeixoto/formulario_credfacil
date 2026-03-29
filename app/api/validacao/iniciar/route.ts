import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verificarJWT } from '@/lib/auth';
import { gerarPresignedRead } from '@/lib/r2';
import clientPromise from '@/lib/mongodb';
import { validarCNH } from '@/lib/ai/validacoes/cnh';
import { validarComprovante } from '@/lib/ai/validacoes/comprovante';
import { validarSelfiePlaca } from '@/lib/ai/validacoes/selfie-placa';
import { validarVideoApp } from '@/lib/ai/validacoes/video-app';
import { validarVideoVeiculo } from '@/lib/ai/validacoes/video-veiculo';
import { validarBiometria } from '@/lib/ai/validacoes/biometria';
import { cruzarDados } from '@/lib/ai/cruzamento';
import { sendTelegramAlert } from '@/lib/telegram-alert';
import type { DocumentosMap, TipoDocumento } from '@/types/documentos';

interface IniciarBody {
  documentos: Record<TipoDocumento, string>; // tipo -> fileKey
  reenvio?: boolean;
  tiposReenvio?: TipoDocumento[];
}

async function executarPipeline(
  formCode: string,
  cpf: string,
  fileKeys: Record<string, string>,
  reenvio: boolean,
  tiposReenvio: TipoDocumento[]
) {
  const client = await clientPromise;
  const db = client.db();

  // Gerar URLs de leitura para cada documento
  const urls: Record<string, string> = {};
  for (const [tipo, key] of Object.entries(fileKeys)) {
    urls[tipo] = await gerarPresignedRead(key);
  }

  const updateStatus = async (tipo: TipoDocumento, updates: Record<string, unknown>) => {
    await db.collection('conversations').updateOne(
      { formCode },
      { $set: { [`documentos.${tipo}`]: updates } }
    );
  };

  const tiposParaValidar = reenvio ? tiposReenvio : Object.keys(fileKeys) as TipoDocumento[];

  // Marcar todos como processando
  for (const tipo of tiposParaValidar) {
    await updateStatus(tipo, {
      url: fileKeys[tipo],
      status: 'processando',
      atualizadoEm: new Date().toISOString(),
    });
  }

  const candidato = await db.collection('conversations').findOne({ formCode });
  const docAtual = (candidato?.documentos ?? {}) as DocumentosMap;

  // Executar validações em paralelo
  const validacoes: Record<string, Promise<{ aprovado: boolean; motivo: string | null; dadosExtraidos: unknown }>> = {};

  for (const tipo of tiposParaValidar) {
    const url = urls[tipo];
    switch (tipo) {
      case 'cnh':
        validacoes.cnh = validarCNH(url);
        break;
      case 'comprovante':
        validacoes.comprovante = validarComprovante(url);
        break;
      case 'selfie':
        validacoes.selfie = validarSelfiePlaca(url);
        break;
      case 'videoApp':
        validacoes.videoApp = validarVideoApp(url);
        break;
      case 'videoVeiculo':
        validacoes.videoVeiculo = validarVideoVeiculo(url);
        break;
    }
  }

  // Biometria requer CNH + selfie
  const cnhUrl = urls.cnh ?? (docAtual.cnh?.url ? await gerarPresignedRead(docAtual.cnh.url) : null);
  const selfieUrl = urls.selfie ?? (docAtual.selfie?.url ? await gerarPresignedRead(docAtual.selfie.url) : null);
  if (cnhUrl && selfieUrl) {
    validacoes.biometria = validarBiometria(cnhUrl, selfieUrl);
  }

  const entries = Object.entries(validacoes);
  const resultados = await Promise.allSettled(entries.map(([, p]) => p));

  const resultadosMap: Record<string, { dadosExtraidos: unknown }> = {};

  for (let i = 0; i < entries.length; i++) {
    const [tipo] = entries[i];
    const resultado = resultados[i];

    if (resultado.status === 'fulfilled') {
      const r = resultado.value;
      resultadosMap[tipo] = { dadosExtraidos: r.dadosExtraidos };

      if (tipo !== 'biometria') {
        const tipoDoc = tipo as TipoDocumento;
        const tentativasAnterior = (docAtual as Record<string, { tentativas?: number }>)[tipoDoc]?.tentativas ?? 0;
        await updateStatus(tipoDoc, {
          url: fileKeys[tipoDoc] ?? docAtual[tipoDoc as keyof DocumentosMap]?.url,
          status: r.aprovado ? 'aprovado' : 'rejeitado',
          tentativas: tentativasAnterior + 1,
          resultado: { aprovado: r.aprovado, motivo: r.motivo, dadosExtraidos: r.dadosExtraidos },
          atualizadoEm: new Date().toISOString(),
        });
      }
    } else {
      console.error(`[validacao] Erro em ${tipo}:`, resultado.reason);
      if (tipo !== 'biometria') {
        const tipoDoc = tipo as TipoDocumento;
        await updateStatus(tipoDoc, {
          url: fileKeys[tipoDoc] ?? docAtual[tipoDoc as keyof DocumentosMap]?.url,
          status: 'erro',
          atualizadoEm: new Date().toISOString(),
        });
      }
    }
  }

  // Cruzamento de dados
  const candidatoAtualizado = await db.collection('conversations').findOne({ formCode });
  const docsFinal = candidatoAtualizado?.documentos ?? {};

  const resultadosParaCruzamento = {
    cnh: docsFinal.cnh?.resultado ? { dadosExtraidos: docsFinal.cnh.resultado.dadosExtraidos } : undefined,
    selfie: docsFinal.selfie?.resultado ? { dadosExtraidos: docsFinal.selfie.resultado.dadosExtraidos } : undefined,
    videoApp: docsFinal.videoApp?.resultado ? { dadosExtraidos: docsFinal.videoApp.resultado.dadosExtraidos } : undefined,
    videoVeiculo: docsFinal.videoVeiculo?.resultado ? { dadosExtraidos: docsFinal.videoVeiculo.resultado.dadosExtraidos } : undefined,
    biometria: resultadosMap.biometria ? { dadosExtraidos: resultadosMap.biometria.dadosExtraidos } : undefined,
  };

  const validacaoIA = cruzarDados(resultadosParaCruzamento as Parameters<typeof cruzarDados>[0], cpf);

  // Determinar status final
  const statusDocs = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'] as TipoDocumento[];
  const todosDocs = (candidatoAtualizado?.documentos ?? {}) as DocumentosMap;

  const algumRejeitado = statusDocs.some(
    (t) => todosDocs[t]?.status === 'rejeitado'
  );
  const todosAprovados = statusDocs.every(
    (t) => todosDocs[t]?.status === 'aprovado'
  );

  let statusDocumentos: string;
  if (todosAprovados && !algumRejeitado) {
    statusDocumentos = 'APROVADO';
  } else if (algumRejeitado) {
    // Verificar se algum doc tem 3+ tentativas rejeitadas
    const precisaAnalise = statusDocs.some(
      (t) => todosDocs[t]?.status === 'rejeitado' && (todosDocs[t]?.tentativas ?? 0) >= 3
    );
    if (precisaAnalise) {
      statusDocumentos = 'ANALISE_MANUAL';
      const docsProblem = statusDocs
        .filter((t) => todosDocs[t]?.status === 'rejeitado' && (todosDocs[t]?.tentativas ?? 0) >= 3)
        .join(', ');
      await sendTelegramAlert(
        `⚠️ *CREDFÁCIL — ANÁLISE MANUAL*\n\nCandidato: \`${cpf}\`\nCódigo: \`${formCode}\`\nDocumentos com 3+ rejeições: *${docsProblem}*`
      );
      await db.collection('conversations').updateOne(
        { formCode },
        { $set: { analistaAlertado: true } }
      );
    } else {
      statusDocumentos = 'PENDENCIA';
    }
  } else {
    statusDocumentos = 'PENDENCIA';
  }

  await db.collection('conversations').updateOne(
    { formCode },
    { $set: { validacaoIA, statusDocumentos } }
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body: IniciarBody = await req.json();
  const { documentos: fileKeys, reenvio = false, tiposReenvio = [] } = body;

  if (!fileKeys || Object.keys(fileKeys).length === 0) {
    return NextResponse.json({ error: 'Nenhum documento informado' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection('conversations').updateOne(
    { formCode: payload.formCode },
    { $set: { statusDocumentos: 'PROCESSANDO' } }
  );

  // Fire and forget
  executarPipeline(
    payload.formCode,
    payload.cpf,
    fileKeys,
    reenvio,
    tiposReenvio
  ).catch((err) => {
    console.error('[validacao/iniciar] Erro no pipeline:', err);
  });

  return NextResponse.json({ status: 'processando' });
}
