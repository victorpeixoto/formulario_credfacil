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
import { cruzarDados, type DadosCadastro } from '@/lib/ai/cruzamento';
import { executarValidacoes, type TarefaValidacao } from '@/lib/ai/pipeline/executar-validacoes';
import { aplicarCruzamentoInline } from '@/lib/ai/pipeline/cruzamento-inline';
import { determinarStatusFinal } from '@/lib/ai/pipeline/determinar-status';
import { sendTelegramAlert } from '@/lib/telegram-alert';
import type { DocumentosMap, TipoDocumento } from '@/types/documentos';

interface IniciarBody {
  documentos: Record<TipoDocumento, string>;
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
  const db = client.db('credfacil');

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

  for (const tipo of tiposParaValidar) {
    await updateStatus(tipo, {
      url: fileKeys[tipo],
      status: 'processando',
      atualizadoEm: new Date().toISOString(),
    });
  }

  const candidato = await db.collection('conversations').findOne({ formCode });
  const docAtual = (candidato?.documentos ?? {}) as DocumentosMap;

  const cadastro: DadosCadastro = {
    nomeCompleto: candidato?.nomeCompleto ?? '',
    cpf,
    logradouro: candidato?.logradouro ?? '',
    numero: candidato?.numero ?? '',
    bairro: candidato?.bairro ?? '',
    cidade: candidato?.cidade ?? '',
    estadoUF: candidato?.estadoUF ?? '',
    cep: candidato?.cep ?? '',
  };

  console.log(`[cadastro] nomeCompleto="${cadastro.nomeCompleto}" cpf="${cadastro.cpf}"`);

  const tarefas: TarefaValidacao[] = [];
  for (const tipo of tiposParaValidar) {
    const url = urls[tipo];
    switch (tipo) {
      case 'cnh': tarefas.push({ tipo: 'cnh', fn: () => validarCNH(url) }); break;
      case 'comprovante': tarefas.push({ tipo: 'comprovante', fn: () => validarComprovante(url, cadastro.nomeCompleto) }); break;
      case 'selfie': tarefas.push({ tipo: 'selfie', fn: () => validarSelfiePlaca(url) }); break;
      case 'videoApp': tarefas.push({ tipo: 'videoApp', fn: () => validarVideoApp(url) }); break;
      case 'videoVeiculo': tarefas.push({ tipo: 'videoVeiculo', fn: () => validarVideoVeiculo(url) }); break;
    }
  }

  const cnhUrl = urls.cnh ?? (docAtual.cnh?.url ? await gerarPresignedRead(docAtual.cnh.url) : null);
  const selfieUrl = urls.selfie ?? (docAtual.selfie?.url ? await gerarPresignedRead(docAtual.selfie.url) : null);
  if (cnhUrl && selfieUrl) {
    tarefas.push({ tipo: 'biometria', fn: () => validarBiometria(cnhUrl, selfieUrl) });
  }

  await executarValidacoes(tarefas, async (tipo, resultado) => {
    const resultadoCruzado = aplicarCruzamentoInline(tipo, resultado, cadastro);

    if (tipo !== 'biometria') {
      const tipoDoc = tipo as TipoDocumento;
      const tentativasAnterior = (docAtual as unknown as Record<string, { tentativas?: number }>)[tipoDoc]?.tentativas ?? 0;
      const { aprovado, motivo, dadosExtraidos, nomeDivergente } = resultadoCruzado;

      const resultadoFinal: Record<string, unknown> = { aprovado, motivo, dadosExtraidos };
      if (tipoDoc === 'comprovante' && typeof nomeDivergente === 'boolean') {
        resultadoFinal.nomeDivergente = nomeDivergente;
      }

      const statusDoc =
        aprovado && tipoDoc === 'comprovante' && nomeDivergente === true
          ? 'analise_manual'
          : aprovado ? 'aprovado' : 'rejeitado';

      await updateStatus(tipoDoc, {
        url: fileKeys[tipoDoc] ?? docAtual[tipoDoc as keyof DocumentosMap]?.url,
        status: statusDoc,
        tentativas: tentativasAnterior + 1,
        resultado: resultadoFinal,
        atualizadoEm: new Date().toISOString(),
      });
    }

    return resultadoCruzado;
  });

  // Tratamento de erros de documentos (status 'erro' para falhas de execução)
  for (const tipo of tiposParaValidar) {
    const tipoDoc = tipo as TipoDocumento;
    const docExistente = (await db.collection('conversations').findOne({ formCode }))?.documentos?.[tipoDoc];
    if (!docExistente || docExistente.status === 'processando') {
      await updateStatus(tipoDoc, {
        url: fileKeys[tipoDoc] ?? docAtual[tipoDoc as keyof DocumentosMap]?.url,
        status: 'erro',
        atualizadoEm: new Date().toISOString(),
      });
    }
  }

  // Cruzamento final: calcula validacaoIA completa e verifica placa entre fontes
  const candidatoAtualizado = await db.collection('conversations').findOne({ formCode });
  const docsFinal = candidatoAtualizado?.documentos ?? {};

  const resultadosParaCruzamento = {
    cnh: docsFinal.cnh?.resultado ? { dadosExtraidos: docsFinal.cnh.resultado.dadosExtraidos } : undefined,
    comprovante: docsFinal.comprovante?.resultado ? { dadosExtraidos: docsFinal.comprovante.resultado.dadosExtraidos } : undefined,
    selfie: docsFinal.selfie?.resultado ? { dadosExtraidos: docsFinal.selfie.resultado.dadosExtraidos } : undefined,
    videoApp: docsFinal.videoApp?.resultado ? { dadosExtraidos: docsFinal.videoApp.resultado.dadosExtraidos } : undefined,
    videoVeiculo: docsFinal.videoVeiculo?.resultado ? { dadosExtraidos: docsFinal.videoVeiculo.resultado.dadosExtraidos } : undefined,
  };

  const validacaoIA = cruzarDados(resultadosParaCruzamento as Parameters<typeof cruzarDados>[0], cadastro);

  if (validacaoIA.placaConfere === false) {
    console.log(`[cruzamento] Rejeitando selfie, vídeo do app e vídeo do veículo: placa divergente entre fontes`);
    const motivoPlaca = 'Placa divergente entre selfie, vídeo do app e vídeo do veículo';
    for (const tipoPlaca of ['selfie', 'videoApp', 'videoVeiculo'] as const) {
      const docExistente = (docsFinal as Record<string, { url?: string; tentativas?: number; resultado?: { dadosExtraidos?: unknown } } | undefined>)[tipoPlaca];
      await updateStatus(tipoPlaca, {
        url: docExistente?.url ?? fileKeys[tipoPlaca],
        status: 'rejeitado',
        tentativas: docExistente?.tentativas ?? 0,
        resultado: { aprovado: false, motivo: motivoPlaca, dadosExtraidos: docExistente?.resultado?.dadosExtraidos ?? {} },
        atualizadoEm: new Date().toISOString(),
      });
    }
  }

  const candidatoFinal = await db.collection('conversations').findOne({ formCode });
  const todosDocs = (candidatoFinal?.documentos ?? {}) as DocumentosMap;

  const { status: statusDocumentos, motivoManual } = determinarStatusFinal(todosDocs, validacaoIA);

  if (statusDocumentos === 'ANALISE_MANUAL' && motivoManual) {
    await sendTelegramAlert(
      `⚠️ *CREDFÁCIL — ANÁLISE MANUAL*\n\nCandidato: \`${cpf}\`\nCódigo: \`${formCode}\`\nMotivo: ${motivoManual}`
    );
    await db.collection('conversations').updateOne({ formCode }, { $set: { analistaAlertado: true } });
  }

  await db.collection('conversations').updateOne(
    { formCode },
    { $set: { validacaoIA, statusDocumentos } }
  );
}

export async function POST(req: NextRequest) {
  try {
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
    const db = client.db('credfacil');

    await db.collection('conversations').updateOne(
      { formCode: payload.formCode },
      { $set: { statusDocumentos: 'PROCESSANDO' } }
    );

    executarPipeline(payload.formCode, payload.cpf, fileKeys, reenvio, tiposReenvio).catch((err) => {
      console.error('[validacao/iniciar] Erro no pipeline:', err);
    });

    return NextResponse.json({ status: 'processando' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[validacao/iniciar] Erro não tratado:', msg);
    if (err instanceof Error && err.stack) {
      console.error('[validacao/iniciar] Stack:', err.stack);
    }
    return NextResponse.json(
      { error: 'Erro interno ao iniciar validação', detail: msg },
      { status: 500 }
    );
  }
}
