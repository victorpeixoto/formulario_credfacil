import { calcularSimilaridade, type DadosCadastro } from '../cruzamento';
import {
  THRESHOLD_NOME,
  THRESHOLD_BIOMETRIA,
  THRESHOLD_ENDERECO_LOGRADOURO,
  THRESHOLD_ENDERECO_BAIRRO,
  THRESHOLD_ENDERECO_CIDADE,
  PROPORCAO_CAMPOS_ENDERECO,
} from './config';
import type { DadosExtraidosMap, ResultadoCruzamento } from './tipos-cruzamento';
import type { StatusDocumento, ValidacaoIA } from '@/types/documentos';

const MOTIVO_CNH_CPF = 'CPF da CNH não confere com o cadastro';
const MOTIVO_CNH_NOME = 'Nome da CNH não confere com o cadastro';
const MOTIVO_COMPROVANTE_ENDERECO = 'Endereço do comprovante não confere com o cadastro';
const MOTIVO_VIDEOAPP_NOME = 'Nome do perfil no app não confere com o cadastro';
const MOTIVO_PLACA = 'Placa divergente entre selfie e vídeo do app';

const somenteDigitos = (s: string): string => s.replace(/\D/g, '');

function normalizarEndereco(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Endereço do comprovante × cadastro. Fonte única usada tanto para o status do
 * comprovante quanto para `validacaoIA.enderecoConfere`. */
function enderecoConfere(comp: Record<string, unknown>, cadastro: DadosCadastro): boolean {
  const checks: boolean[] = [];
  if (comp.logradouro) checks.push(calcularSimilaridade(String(comp.logradouro), cadastro.logradouro) >= THRESHOLD_ENDERECO_LOGRADOURO);
  if (comp.numero) checks.push(normalizarEndereco(String(comp.numero)) === normalizarEndereco(cadastro.numero));
  if (comp.bairro && cadastro.bairro) checks.push(calcularSimilaridade(String(comp.bairro), cadastro.bairro) >= THRESHOLD_ENDERECO_BAIRRO);
  if (comp.cidade) checks.push(calcularSimilaridade(String(comp.cidade), cadastro.cidade) >= THRESHOLD_ENDERECO_CIDADE);
  if (comp.estadoUF) checks.push(String(comp.estadoUF).toUpperCase() === cadastro.estadoUF.toUpperCase());
  if (comp.cep && cadastro.cep) checks.push(somenteDigitos(String(comp.cep)) === somenteDigitos(cadastro.cep));

  const acertos = checks.filter(Boolean).length;
  return checks.length > 0 && acertos >= Math.ceil(checks.length * PROPORCAO_CAMPOS_ENDERECO);
}

/** Função pura: recebe os dados extraídos de todos os documentos + o cadastro e
 * devolve, de uma só vez, o status de cada documento e o `validacaoIA`.
 * Sem I/O (Mongo, R2, IA): testável isoladamente. */
export function avaliarCruzamento(
  extraidos: DadosExtraidosMap,
  cadastro: DadosCadastro
): ResultadoCruzamento {
  const cnh = extraidos.cnh?.dadosExtraidos;
  const comp = extraidos.comprovante?.dadosExtraidos;
  const selfie = extraidos.selfie?.dadosExtraidos;
  const videoApp = extraidos.videoApp?.dadosExtraidos;
  const biometria = extraidos.biometria?.dadosExtraidos;

  const statusPorDoc: ResultadoCruzamento['statusPorDoc'] = {};
  const motivos: ResultadoCruzamento['motivos'] = {};

  const enderecoOk = comp ? enderecoConfere(comp, cadastro) : null;
  const comprovanteNomeDivergente =
    comp?.nome ? calcularSimilaridade(String(comp.nome), cadastro.nomeCompleto) < THRESHOLD_NOME : null;

  // ── CNH ──
  if (extraidos.cnh) {
    const cpfCNH = cnh?.cpf ? somenteDigitos(String(cnh.cpf)) : '';
    const cpfCad = somenteDigitos(cadastro.cpf);
    const nomeReprovado =
      cnh?.nome && cadastro.nomeCompleto
        ? calcularSimilaridade(String(cnh.nome), cadastro.nomeCompleto) < THRESHOLD_NOME
        : false;

    if (!extraidos.cnh.aprovadoRegraPropria) {
      statusPorDoc.cnh = 'rejeitado';
      motivos.cnh = extraidos.cnh.motivo;
    } else if (cpfCNH && cpfCNH !== cpfCad) {
      statusPorDoc.cnh = 'rejeitado';
      motivos.cnh = MOTIVO_CNH_CPF;
    } else if (nomeReprovado) {
      statusPorDoc.cnh = 'rejeitado';
      motivos.cnh = MOTIVO_CNH_NOME;
    } else {
      statusPorDoc.cnh = 'aprovado';
      motivos.cnh = extraidos.cnh.motivo;
    }
  }

  // ── Comprovante ──
  if (extraidos.comprovante) {
    if (!extraidos.comprovante.aprovadoRegraPropria) {
      statusPorDoc.comprovante = 'rejeitado';
      motivos.comprovante = extraidos.comprovante.motivo;
    } else if (enderecoOk === false) {
      statusPorDoc.comprovante = 'rejeitado';
      motivos.comprovante = MOTIVO_COMPROVANTE_ENDERECO;
    } else if (comprovanteNomeDivergente === true) {
      statusPorDoc.comprovante = 'analise_manual';
      motivos.comprovante = extraidos.comprovante.motivo;
    } else {
      statusPorDoc.comprovante = 'aprovado';
      motivos.comprovante = extraidos.comprovante.motivo;
    }
  }

  // ── Selfie e Vídeo do veículo (sem regra de cruzamento própria) ──
  // Obs.: o vídeo do veículo não participa do cruzamento de placa; a placa da
  // selfie é tratada adiante (cruzamento selfie × vídeo do app).
  for (const tipo of ['selfie', 'videoVeiculo'] as const) {
    const entrada = extraidos[tipo];
    if (entrada) {
      statusPorDoc[tipo] = entrada.aprovadoRegraPropria ? 'aprovado' : 'rejeitado';
      motivos[tipo] = entrada.motivo;
    }
  }

  // ── Vídeo do app ──
  if (extraidos.videoApp) {
    const nomePerfil = String(videoApp?.nomePerfil ?? '').trim();
    const nomeReprovado =
      nomePerfil && cadastro.nomeCompleto
        ? calcularSimilaridade(nomePerfil, cadastro.nomeCompleto) < THRESHOLD_NOME
        : false;

    if (!extraidos.videoApp.aprovadoRegraPropria) {
      statusPorDoc.videoApp = 'rejeitado';
      motivos.videoApp = extraidos.videoApp.motivo;
    } else if (nomeReprovado) {
      statusPorDoc.videoApp = 'rejeitado';
      motivos.videoApp = MOTIVO_VIDEOAPP_NOME;
    } else {
      statusPorDoc.videoApp = 'aprovado';
      motivos.videoApp = extraidos.videoApp.motivo;
    }
  }

  // ── validacaoIA ──
  const nomeCadastroConfere = cnh?.nome ? calcularSimilaridade(String(cnh.nome), cadastro.nomeCompleto) >= THRESHOLD_NOME : null;
  const nomeConfere = cnh?.nome && videoApp?.nomePerfil
    ? calcularSimilaridade(String(cnh.nome), String(videoApp.nomePerfil)) >= THRESHOLD_NOME
    : null;
  const cpfConfere = cnh?.cpf ? somenteDigitos(String(cnh.cpf)) === somenteDigitos(cadastro.cpf) : null;

  let placaConfere: boolean | null = null;
  const placas = [selfie?.placa, videoApp?.placa]
    .filter(Boolean)
    .map((p) => String(p).replace(/\s/g, '').toUpperCase());
  if (placas.length >= 2) {
    const contagem = new Map<string, number>();
    for (const p of placas) contagem.set(p, (contagem.get(p) ?? 0) + 1);
    placaConfere = Array.from(contagem.values()).some((v) => v >= 2);
  }

  const biometriaScore = biometria && typeof biometria.similarity === 'number' ? biometria.similarity : null;
  const biometriaConfere = biometriaScore === null ? null : biometriaScore >= THRESHOLD_BIOMETRIA;

  const validacaoIA: ValidacaoIA = {
    nomeCadastroConfere,
    nomeConfere,
    placaConfere,
    cpfConfere,
    enderecoConfere: enderecoOk,
    biometriaConfere,
    biometriaScore,
    comprovanteNomeDivergente,
  };

  // ── Placa divergente entre fontes → rejeita selfie / vídeo do app ──
  if (placaConfere === false) {
    for (const tipo of ['selfie', 'videoApp'] as const) {
      if (extraidos[tipo]) {
        statusPorDoc[tipo] = 'rejeitado' as StatusDocumento;
        motivos[tipo] = MOTIVO_PLACA;
      }
    }
  }

  return { statusPorDoc, motivos, validacaoIA };
}
