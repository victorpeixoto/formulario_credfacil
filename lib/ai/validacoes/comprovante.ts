import { analisarImagem } from '../gemini';
import { calcularSimilaridade } from '../cruzamento';
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

const PRAZO_DIAS = 90;

export async function validarComprovante(imageUrl: string, nomeCadastro: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoComprovante;
  nomeDivergente: boolean;
}> {
  const dados = (await analisarImagem(imageUrl, PROMPT)) as unknown as ResultadoComprovante;

  const nomeDivergente = dados.nome ? calcularSimilaridade(dados.nome, nomeCadastro) < 85 : false;

  if (!dados.legivel) {
    return { aprovado: false, motivo: 'Comprovante ilegível ou com cortes', dadosExtraidos: dados, nomeDivergente };
  }

  if (dados.dataEmissao) {
    const emissao = new Date(dados.dataEmissao);
    const limite = new Date();
    limite.setDate(limite.getDate() - PRAZO_DIAS);
    if (emissao < limite) {
      return { aprovado: false, motivo: `Comprovante com mais de ${PRAZO_DIAS} dias`, dadosExtraidos: dados, nomeDivergente };
    }
  } else {
    return { aprovado: false, motivo: 'Data de emissão não identificada', dadosExtraidos: dados, nomeDivergente };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados, nomeDivergente };
}
