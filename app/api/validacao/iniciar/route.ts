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
import { cruzarDados, calcularSimilaridade, type DadosCadastro } from '@/lib/ai/cruzamento';
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
  const db = client.db('credfacil');

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

  // Dados do cadastro para cruzamento em tempo real
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

  // Executar validações sequencialmente para evitar rate limit do Gemini
  const DELAY_ENTRE_VALIDACOES_MS = 2000;
  const tarefas: Array<[string, () => Promise<{ aprovado: boolean; motivo: string | null; dadosExtraidos: unknown }>]> = [];

  for (const tipo of tiposParaValidar) {
    const url = urls[tipo];
    switch (tipo) {
      case 'cnh': tarefas.push(['cnh', () => validarCNH(url)]); break;
      case 'comprovante': tarefas.push(['comprovante', () => validarComprovante(url, cadastro.nomeCompleto)]); break;
      case 'selfie': tarefas.push(['selfie', () => validarSelfiePlaca(url)]); break;
      case 'videoApp': tarefas.push(['videoApp', () => validarVideoApp(url)]); break;
      case 'videoVeiculo': tarefas.push(['videoVeiculo', () => validarVideoVeiculo(url)]); break;
    }
  }

  // Biometria requer CNH + selfie (AWS Rekognition — não afeta quota Gemini)
  const cnhUrl = urls.cnh ?? (docAtual.cnh?.url ? await gerarPresignedRead(docAtual.cnh.url) : null);
  const selfieUrl = urls.selfie ?? (docAtual.selfie?.url ? await gerarPresignedRead(docAtual.selfie.url) : null);
  if (cnhUrl && selfieUrl) {
    tarefas.push(['biometria', () => validarBiometria(cnhUrl, selfieUrl)]);
  }

  // Acumula resultados para cruzamento final
  const resultadosMap: Record<string, { dadosExtraidos: unknown }> = {};

  for (let i = 0; i < tarefas.length; i++) {
    const [tipo, fn] = tarefas[i];
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_ENTRE_VALIDACOES_MS));
    console.log(`[validacao] Iniciando: ${tipo}`);
    const inicio = Date.now();
    const executarComRetry = async () => {
      try {
        return { status: 'fulfilled' as const, value: await fn() };
      } catch (e) {
        console.warn(`[validacao] ${tipo}: 1ª tentativa falhou (${e instanceof Error ? e.message : String(e)}), tentando novamente em 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
        try {
          return { status: 'fulfilled' as const, value: await fn() };
        } catch (e2) {
          return { status: 'rejected' as const, reason: e2 };
        }
      }
    };
    const resultado = await executarComRetry();
    const duracaoMs = Date.now() - inicio;

    if (resultado.status === 'fulfilled') {
      let { aprovado, motivo } = resultado.value;
      const { dadosExtraidos } = resultado.value;
      const nomeDivergenteComp = (resultado.value as { nomeDivergente?: boolean }).nomeDivergente;
      console.log(
        `[validacao] ${tipo}: ${aprovado ? 'APROVADO' : 'REJEITADO'} (${duracaoMs}ms)` +
        (motivo ? ` | motivo: ${motivo}` : '')
      );
      console.log(`[validacao] ${tipo} dadosExtraidos:`, JSON.stringify(dadosExtraidos, null, 2));

      resultadosMap[tipo] = { dadosExtraidos };

      // Cruzamento em tempo real com dados do cadastro
      if (aprovado && tipo === 'cnh') {
        const dados = dadosExtraidos as Record<string, unknown>;
        const cpfCNH = String(dados.cpf ?? '').replace(/\D/g, '');
        const cpfCad = cadastro.cpf.replace(/\D/g, '');

        console.log(`[cruzamento] CNH: nome="${dados.nome}" | cadastro: nome="${cadastro.nomeCompleto}" cpf="${cpfCad}"`);

        if (cpfCNH && cpfCNH !== cpfCad) {
          aprovado = false;
          motivo = 'CPF da CNH não confere com o cadastro';
          console.log(`[cruzamento] CNH rejeitada: CPF divergente`);
        } else if (cadastro.nomeCompleto && dados.nome) {
          const sim = calcularSimilaridade(String(dados.nome), cadastro.nomeCompleto);
          console.log(`[cruzamento] CNH nome: "${dados.nome}" vs "${cadastro.nomeCompleto}" → ${sim}%`);
          if (sim < 85) {
            aprovado = false;
            motivo = 'Nome da CNH não confere com o cadastro';
          }
        }
      }

      if (aprovado && tipo === 'comprovante') {
        const dados = dadosExtraidos as Record<string, unknown>;
        const checks: boolean[] = [];
        if (dados.logradouro) checks.push(calcularSimilaridade(String(dados.logradouro), cadastro.logradouro) >= 80);
        if (dados.numero) checks.push(String(dados.numero).trim() === cadastro.numero.trim());
        if (dados.bairro && cadastro.bairro) checks.push(calcularSimilaridade(String(dados.bairro), cadastro.bairro) >= 80);
        if (dados.cidade) checks.push(calcularSimilaridade(String(dados.cidade), cadastro.cidade) >= 85);
        if (dados.estadoUF) checks.push(String(dados.estadoUF).toUpperCase() === cadastro.estadoUF.toUpperCase());
        if (dados.cep && cadastro.cep) checks.push(String(dados.cep).replace(/\D/g, '') === cadastro.cep.replace(/\D/g, ''));

        const acertos = checks.filter(Boolean).length;
        if (checks.length > 0 && acertos < Math.ceil(checks.length * 0.7)) {
          aprovado = false;
          motivo = 'Endereço do comprovante não confere com o cadastro';
          console.log(`[cruzamento] Comprovante rejeitado: ${acertos}/${checks.length} campos conferem`);
          console.log(`[cruzamento] comprovante: log="${dados.logradouro}" n="${dados.numero}" bairro="${dados.bairro}" cidade="${dados.cidade}" uf="${dados.estadoUF}" cep="${dados.cep}"`);
          console.log(`[cruzamento] cadastro:    log="${cadastro.logradouro}" n="${cadastro.numero}" bairro="${cadastro.bairro}" cidade="${cadastro.cidade}" uf="${cadastro.estadoUF}" cep="${cadastro.cep}"`);
        } else if (nomeDivergenteComp === true) {
          // Endereço confere mas comprovante está em nome de terceiro — encaminhar para análise manual
          console.log(`[cruzamento] Comprovante: endereço OK mas nome de terceiro → analise_manual`);
        }
      }

      if (aprovado && tipo === 'biometria') {
        const dados = dadosExtraidos as Record<string, unknown>;
        if (typeof dados.similarity === 'number' && dados.similarity < 90) {
          aprovado = false;
          motivo = `Biometria não confirmada (similaridade: ${dados.similarity.toFixed(1)}%)`;
          console.log(`[cruzamento] Biometria rejeitada: ${dados.similarity.toFixed(1)}%`);
        }
      }

      if (aprovado && tipo === 'videoApp') {
        const dados = dadosExtraidos as Record<string, unknown>;
        const nomePerfil = String(dados.nomePerfil ?? '').trim();

        if (nomePerfil && cadastro.nomeCompleto) {
          const sim = calcularSimilaridade(nomePerfil, cadastro.nomeCompleto);
          console.log(`[cruzamento] videoApp nomePerfil="${nomePerfil}" vs cadastro="${cadastro.nomeCompleto}" → ${sim}%`);
          if (sim < 85) {
            aprovado = false;
            motivo = 'Nome do perfil no app não confere com o cadastro';
          }
        }
      }

      if (tipo !== 'biometria') {
        const tipoDoc = tipo as TipoDocumento;
        const tentativasAnterior = (docAtual as unknown as Record<string, { tentativas?: number }>)[tipoDoc]?.tentativas ?? 0;
        const resultadoFinal: Record<string, unknown> = { aprovado, motivo, dadosExtraidos };
        if (tipoDoc === 'comprovante' && typeof nomeDivergenteComp === 'boolean') {
          resultadoFinal.nomeDivergente = nomeDivergenteComp;
        }
        // Comprovante em nome de terceiro com endereço OK: status analise_manual (não aprovado nem rejeitado)
        const statusDoc = aprovado && tipoDoc === 'comprovante' && nomeDivergenteComp === true
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
    } else {
      const err = resultado.reason;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[validacao] ${tipo}: ERRO (${duracaoMs}ms) | ${msg}`);
      if (err instanceof Error && err.stack) {
        console.error(`[validacao] ${tipo} stack:`, err.stack);
      }
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

  // Cruzamento final (placa entre fontes + gerar validacaoIA completa)
  const candidatoAtualizado = await db.collection('conversations').findOne({ formCode });
  const docsFinal = candidatoAtualizado?.documentos ?? {};

  const resultadosParaCruzamento = {
    cnh: docsFinal.cnh?.resultado ? { dadosExtraidos: docsFinal.cnh.resultado.dadosExtraidos } : undefined,
    comprovante: docsFinal.comprovante?.resultado ? { dadosExtraidos: docsFinal.comprovante.resultado.dadosExtraidos } : undefined,
    selfie: docsFinal.selfie?.resultado ? { dadosExtraidos: docsFinal.selfie.resultado.dadosExtraidos } : undefined,
    videoApp: docsFinal.videoApp?.resultado ? { dadosExtraidos: docsFinal.videoApp.resultado.dadosExtraidos } : undefined,
    videoVeiculo: docsFinal.videoVeiculo?.resultado ? { dadosExtraidos: docsFinal.videoVeiculo.resultado.dadosExtraidos } : undefined,
    biometria: resultadosMap.biometria ? { dadosExtraidos: resultadosMap.biometria.dadosExtraidos } : undefined,
  };

  const validacaoIA = cruzarDados(resultadosParaCruzamento as Parameters<typeof cruzarDados>[0], cadastro);

  // Verificar divergências críticas de identidade no cruzamento final
  const divergenciaIdentidade =
    validacaoIA.nomeCadastroConfere === false ||
    validacaoIA.nomeConfere === false ||
    validacaoIA.cpfConfere === false;

  if (divergenciaIdentidade) {
    console.log(`[cruzamento] Divergência de identidade detectada:`, {
      nomeCadastroConfere: validacaoIA.nomeCadastroConfere,
      nomeConfere: validacaoIA.nomeConfere,
      cpfConfere: validacaoIA.cpfConfere,
    });
  }

  // Rejeitar placa divergente (depende de múltiplas fontes, só pode ser feito no final)
  if (validacaoIA.placaConfere === false) {
    console.log(`[cruzamento] Rejeitando selfie, vídeo do app e vídeo do veículo: placa divergente entre fontes`);
    const motivoPlaca = 'Placa divergente entre selfie, vídeo do app e vídeo do veículo';
    for (const tipoPlaca of ['selfie', 'videoApp', 'videoVeiculo'] as const) {
      const docExistente = (docsFinal as Record<string, { url?: string; tentativas?: number; resultado?: { dadosExtraidos?: unknown } } | undefined>)[tipoPlaca];
      await updateStatus(tipoPlaca, {
        url: docExistente?.url ?? fileKeys[tipoPlaca],
        status: 'rejeitado',
        tentativas: docExistente?.tentativas ?? 0,
        resultado: {
          aprovado: false,
          motivo: motivoPlaca,
          dadosExtraidos: docExistente?.resultado?.dadosExtraidos ?? {},
        },
        atualizadoEm: new Date().toISOString(),
      });
    }
  }

  // Determinar status final
  const candidatoFinal = await db.collection('conversations').findOne({ formCode });

  const statusDocs = ['cnh', 'comprovante', 'selfie', 'videoApp', 'videoVeiculo'] as TipoDocumento[];
  const todosDocs = (candidatoFinal?.documentos ?? {}) as DocumentosMap;

  const algumRejeitado = statusDocs.some(
    (t) => todosDocs[t]?.status === 'rejeitado'
  );
  const todosAprovados = statusDocs.every(
    (t) => todosDocs[t]?.status === 'aprovado' || todosDocs[t]?.status === 'analise_manual'
  );
  const algumAnaliseManual = statusDocs.some(
    (t) => todosDocs[t]?.status === 'analise_manual'
  );

  let statusDocumentos: string;
  if (todosAprovados && !algumRejeitado && !divergenciaIdentidade && (validacaoIA.comprovanteNomeDivergente === true || algumAnaliseManual)) {
    statusDocumentos = 'ANALISE_MANUAL';
    await sendTelegramAlert(
      `⚠️ *CREDFÁCIL — ANÁLISE MANUAL*\n\nCandidato: \`${cpf}\`\nCódigo: \`${formCode}\`\nMotivo: Comprovante em nome de terceiro`
    );
    await db.collection('conversations').updateOne(
      { formCode },
      { $set: { analistaAlertado: true } }
    );
  } else if (todosAprovados && !algumRejeitado && !divergenciaIdentidade) {
    statusDocumentos = 'APROVADO';
  } else if (algumRejeitado || divergenciaIdentidade) {
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
