import { analisarImagem } from '../gemini';
import { PRAZO_COMPROVANTE_DIAS } from '../pipeline/config';
import type { ResultadoComprovante } from '@/types/documentos';

const PROMPT = `Analise este comprovante de residência brasileiro e extraia:
1. Nome do titular
2. Data de emissão ou referência (formato YYYY-MM-DD)
3. Endereço completo (texto livre)
4. Endereço estruturado: logradouro (rua/av), número, bairro, cidade, estado (sigla UF), CEP
5. Tipo do comprovante (conta de luz, água, telefone, etc.)
6. O documento está legível e sem cortes?

Responda APENAS em JSON:
{
  "nome": "...",
  "dataEmissao": "YYYY-MM-DD",
  "endereco": "Rua X, 123, Bairro Y, Cidade - UF, 00000-000",
  "logradouro": "Rua X",
  "numero": "123",
  "bairro": "Bairro Y",
  "cidade": "Cidade",
  "estadoUF": "UF",
  "cep": "00000000",
  "tipo": "...",
  "legivel": true
}`;

// Regra PRÓPRIA do comprovante: legibilidade + prazo. O cruzamento com o cadastro
// (endereço, nome de terceiro) vive em `pipeline/avaliar-cruzamento.ts`.
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
    limite.setDate(limite.getDate() - PRAZO_COMPROVANTE_DIAS);
    if (emissao < limite) {
      return { aprovado: false, motivo: `Comprovante com mais de ${PRAZO_COMPROVANTE_DIAS} dias`, dadosExtraidos: dados };
    }
  } else {
    return { aprovado: false, motivo: 'Data de emissão não identificada', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
