import { analisarImagem } from '../gemini';
import { DIAS_MINIMOS_VALIDADE_CNH } from '../pipeline/config';
import type { ResultadoCNH } from '@/types/documentos';

const PROMPT = `Analise esta imagem de CNH brasileira e extraia:
1. Nome completo
2. CPF
3. Data de validade (formato YYYY-MM-DD)
4. Categoria da habilitação
5. A imagem está legível e sem cortes?

Responda APENAS em JSON:
{
  "nome": "...",
  "cpf": "...",
  "validade": "YYYY-MM-DD",
  "categoria": "...",
  "legivel": true
}`;

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const MOTIVO_CNH_PROXIMA_VENCIMENTO = 'CNH próxima do vencimento. É necessário pelo menos 30 dias de validade na data da análise.';

function inicioDiaUTC(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

function parseDataISOEmUTC(valor: string): number | null {
  const partes = valor.split('-').map(Number);
  if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) return null;

  const [ano, mes, dia] = partes;
  const dataUTC = Date.UTC(ano, mes - 1, dia);
  const data = new Date(dataUTC);
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;

  return dataUTC;
}

export function validarRegraCNH(dados: ResultadoCNH, dataAnalise = new Date()): {
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoCNH;
} {
  if (!dados.legivel) {
    return { aprovado: false, motivo: 'CNH ilegível ou com cortes', dadosExtraidos: dados };
  }

  if (!dados.validade) {
    return { aprovado: false, motivo: 'Data de validade não identificada', dadosExtraidos: dados };
  }

  const validade = parseDataISOEmUTC(dados.validade);
  if (validade === null) {
    return { aprovado: false, motivo: 'Data de validade não identificada', dadosExtraidos: dados };
  }

  const hoje = inicioDiaUTC(dataAnalise);
  const limiteMinimo = hoje + DIAS_MINIMOS_VALIDADE_CNH * MS_POR_DIA;

  if (validade < hoje) {
    return { aprovado: false, motivo: 'CNH vencida', dadosExtraidos: dados };
  }

  if (validade < limiteMinimo) {
    return { aprovado: false, motivo: MOTIVO_CNH_PROXIMA_VENCIMENTO, dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}

export async function validarCNH(imageUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoCNH;
}> {
  const dados = (await analisarImagem(imageUrl, PROMPT)) as unknown as ResultadoCNH;
  return validarRegraCNH(dados);
}
