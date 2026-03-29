import { analisarImagem } from '../gemini';
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

export async function validarCNH(imageUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoCNH;
}> {
  const dados = (await analisarImagem(imageUrl, PROMPT)) as unknown as ResultadoCNH;

  if (!dados.legivel) {
    return { aprovado: false, motivo: 'CNH ilegível ou com cortes', dadosExtraidos: dados };
  }

  if (dados.validade) {
    const validade = new Date(dados.validade);
    if (validade < new Date()) {
      return { aprovado: false, motivo: 'CNH vencida', dadosExtraidos: dados };
    }
  } else {
    return { aprovado: false, motivo: 'Data de validade não identificada', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
