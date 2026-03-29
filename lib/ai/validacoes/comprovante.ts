import { analisarImagem } from '../gemini';
import type { ResultadoComprovante } from '@/types/documentos';

const PROMPT = `Analise este comprovante de residência brasileiro e extraia:
1. Nome do titular
2. Data de emissão ou referência (formato YYYY-MM-DD)
3. Endereço completo
4. Tipo do comprovante (conta de luz, água, telefone, etc.)
5. O documento está legível e sem cortes?

Responda APENAS em JSON:
{
  "nome": "...",
  "dataEmissao": "YYYY-MM-DD",
  "endereco": "...",
  "tipo": "...",
  "legivel": true
}`;

const PRAZO_DIAS = 90;

export async function validarComprovante(imageUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoComprovante;
}> {
  const dados = (await analisarImagem(imageUrl, PROMPT)) as unknown as ResultadoComprovante;

  if (!dados.legivel) {
    return { aprovado: false, motivo: 'Comprovante ilegível ou com cortes', dadosExtraidos: dados };
  }

  if (dados.dataEmissao) {
    const emissao = new Date(dados.dataEmissao);
    const limite = new Date();
    limite.setDate(limite.getDate() - PRAZO_DIAS);
    if (emissao < limite) {
      return { aprovado: false, motivo: `Comprovante com mais de ${PRAZO_DIAS} dias`, dadosExtraidos: dados };
    }
  } else {
    return { aprovado: false, motivo: 'Data de emissão não identificada', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
