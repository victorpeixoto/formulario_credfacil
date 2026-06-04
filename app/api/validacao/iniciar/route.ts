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
import { type DadosCadastro } from '@/lib/ai/cruzamento';
import { executarValidacoes, isErroTarefa, type TarefaValidacao } from '@/lib/ai/pipeline/executar-validacoes';
import { avaliarCruzamento } from '@/lib/ai/pipeline/avaliar-cruzamento';
import type { DadosExtraidosMap } from '@/lib/ai/pipeline/tipos-cruzamento';
import { determinarStatusFinal } from '@/lib/ai/pipeline/determinar-status';
import { sendTelegramAlert } from '@/lib/telegram-alert';
import type { DocumentoInfo, DocumentosMap, StatusDocumento, TipoDocumento } from '@/types/documentos';

const TIPOS_DOCUMENTO: TipoDocumento[] = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'];
const TIPOS_PLACA: TipoDocumento[] = ['selfie', 'videoApp', 'videoVeiculo'];
const MOTIVO_COMPROVANTE_TERCEIRO = 'Comprovante em nome de terceiro/parente';

interface IniciarBody {
  documentos: Record<TipoDocumento, string>;
  reenvio?: boolean;
  tiposReenvio?: TipoDocumento[];
  comprovanteTerceiro?: boolean;
}

async function executarPipeline(
  formCode: string,
  cpf: string,
  fileKeys: Record<string, string>,
  reenvio: boolean,
  tiposReenvio: TipoDocumento[],
  comprovanteTerceiro: boolean
) {
  const client = await clientPromise;
  const db = client.db('credfacil');
  const conversations = db.collection('conversations');
  const agora = () => new Date().toISOString();

  // ── 1 READ: cadastro + documentos atuais ──
  const candidato = await conversations.findOne({ formCode });
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

  const tiposParaValidar = (reenvio ? tiposReenvio : (Object.keys(fileKeys) as TipoDocumento[]));
  const comprovanteDeclaradoTerceiro =
    comprovanteTerceiro && tiposParaValidar.includes('comprovante');

  // Presigned URLs dos arquivos enviados agora
  const urls: Record<string, string> = {};
  for (const [tipo, key] of Object.entries(fileKeys)) {
    urls[tipo] = await gerarPresignedRead(key);
  }

  // Progresso: 1 update enxuto marcando os docs a validar como 'processando'
  const setProgresso: Record<string, unknown> = {};
  for (const tipo of tiposParaValidar) {
    setProgresso[`documentos.${tipo}.status`] = 'processando';
    setProgresso[`documentos.${tipo}.atualizadoEm`] = agora();
  }
  if (Object.keys(setProgresso).length > 0) {
    await conversations.updateOne({ formCode }, { $set: setProgresso });
  }

  // Monta tarefas de validação (executadas em paralelo)
  const tarefas: TarefaValidacao[] = [];
  for (const tipo of tiposParaValidar) {
    if (tipo === 'comprovante' && comprovanteDeclaradoTerceiro) continue;

    const url = urls[tipo];
    switch (tipo) {
      case 'cnh': tarefas.push({ tipo: 'cnh', fn: () => validarCNH(url) }); break;
      case 'comprovante': tarefas.push({ tipo: 'comprovante', fn: () => validarComprovante(url) }); break;
      case 'selfie': tarefas.push({ tipo: 'selfie', fn: () => validarSelfiePlaca(url) }); break;
      case 'videoApp': tarefas.push({ tipo: 'videoApp', fn: () => validarVideoApp(url) }); break;
      case 'videoVeiculo': tarefas.push({ tipo: 'videoVeiculo', fn: () => validarVideoVeiculo(url) }); break;
    }
  }

  // Biometria depende de CNH + selfie; reaproveita URL já armazenada se não veio neste lote
  const cnhUrl = urls.cnh ?? (docAtual.cnh?.url ? await gerarPresignedRead(docAtual.cnh.url) : null);
  const selfieUrl = urls.selfie ?? (docAtual.selfie?.url ? await gerarPresignedRead(docAtual.selfie.url) : null);
  if (cnhUrl && selfieUrl) {
    tarefas.push({ tipo: 'biometria', fn: () => validarBiometria(cnhUrl, selfieUrl) });
  }

  // ── Validações em PARALELO ──
  const resultados = await executarValidacoes(tarefas);

  // Monta os dados extraídos para o cruzamento: resultados novos + dados já armazenados
  // (necessário p/ reenvio parcial — placa/nome dependem de documentos não reenviados).
  const extraidos: DadosExtraidosMap = {};
  for (const tipo of [...TIPOS_DOCUMENTO, 'biometria' as const]) {
    const novo = resultados.get(tipo);
    if (novo && !isErroTarefa(novo)) {
      extraidos[tipo] = {
        aprovadoRegraPropria: novo.aprovado,
        motivo: novo.motivo,
        dadosExtraidos: (novo.dadosExtraidos ?? {}) as Record<string, unknown>,
      };
    } else if (tipo !== 'biometria') {
      const armazenado = docAtual[tipo]?.resultado;
      if (armazenado) {
        extraidos[tipo] = {
          aprovadoRegraPropria: armazenado.aprovado,
          motivo: armazenado.motivo,
          dadosExtraidos: armazenado.dadosExtraidos ?? {},
        };
      }
    }
  }

  // ── Cruzamento unificado (fonte única; placa entre fontes incluída aqui) ──
  const { statusPorDoc, motivos, validacaoIA } = avaliarCruzamento(extraidos, cadastro);

  if (comprovanteDeclaradoTerceiro) {
    extraidos.comprovante = {
      aprovadoRegraPropria: true,
      motivo: MOTIVO_COMPROVANTE_TERCEIRO,
      dadosExtraidos: { comprovanteTerceiro: true },
    };
    statusPorDoc.comprovante = 'analise_manual';
    motivos.comprovante = MOTIVO_COMPROVANTE_TERCEIRO;
    validacaoIA.comprovanteNomeDivergente = true;
  }

  // ── Monta documentos finais + 1 WRITE consolidado ──
  const docsFinais: DocumentosMap = { ...docAtual };
  const setFinal: Record<string, unknown> = {};

  for (const tipo of TIPOS_DOCUMENTO) {
    const resultadoTarefa = resultados.get(tipo);
    const reidentificado = tiposParaValidar.includes(tipo);
    const afetadoPlaca =
      validacaoIA.placaConfere === false && TIPOS_PLACA.includes(tipo) && extraidos[tipo] !== undefined;

    if (!reidentificado && !afetadoPlaca) continue; // mantém o documento como está

    const tentativasAnterior = docAtual[tipo]?.tentativas ?? 0;
    let doc: DocumentoInfo;

    if (reidentificado && resultadoTarefa && isErroTarefa(resultadoTarefa)) {
      // Falha definitiva da IA → erro (status final cairá em PENDENCIA)
      doc = {
        url: fileKeys[tipo] ?? docAtual[tipo]?.url ?? null,
        status: 'erro',
        tentativas: tentativasAnterior + 1,
        resultado: docAtual[tipo]?.resultado ?? null,
        atualizadoEm: agora(),
      };
    } else {
      const status = (statusPorDoc[tipo] ?? docAtual[tipo]?.status ?? 'erro') as StatusDocumento;
      const base = extraidos[tipo];
      doc = {
        url: fileKeys[tipo] ?? docAtual[tipo]?.url ?? null,
        status,
        tentativas: reidentificado ? tentativasAnterior + 1 : tentativasAnterior,
        resultado: base
          ? {
              aprovado: status === 'aprovado' || status === 'analise_manual',
              motivo: motivos[tipo] ?? null,
              dadosExtraidos: base.dadosExtraidos,
            }
          : docAtual[tipo]?.resultado ?? null,
        atualizadoEm: agora(),
      };
    }

    docsFinais[tipo] = doc;
    setFinal[`documentos.${tipo}`] = doc;
  }

  const { status: statusDocumentos, motivoManual } = determinarStatusFinal(docsFinais, validacaoIA);

  if (statusDocumentos === 'ANALISE_MANUAL' && motivoManual) {
    await sendTelegramAlert(
      `⚠️ *CREDFÁCIL — ANÁLISE MANUAL*\n\nCandidato: \`${cpf}\`\nCódigo: \`${formCode}\`\nMotivo: ${motivoManual}`
    );
    setFinal.analistaAlertado = true;
  }

  setFinal.validacaoIA = validacaoIA;
  setFinal.statusDocumentos = statusDocumentos;

  await conversations.updateOne({ formCode }, { $set: setFinal });
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
    const { documentos: fileKeys, reenvio = false, tiposReenvio = [], comprovanteTerceiro = false } = body;

    if (!fileKeys || Object.keys(fileKeys).length === 0) {
      return NextResponse.json({ error: 'Nenhum documento informado' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('credfacil');

    await db.collection('conversations').updateOne(
      { formCode: payload.formCode },
      { $set: { statusDocumentos: 'PROCESSANDO' } }
    );

    executarPipeline(payload.formCode, payload.cpf, fileKeys, reenvio, tiposReenvio, comprovanteTerceiro === true).catch((err) => {
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
