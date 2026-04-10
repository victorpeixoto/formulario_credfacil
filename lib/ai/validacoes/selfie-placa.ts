import { analisarImagemComEspelho } from '../gemini';
import type { ResultadoSelfie } from '@/types/documentos';

const PROMPT = `Você receberá DUAS versões da mesma foto: a original e uma versão espelhada horizontalmente.
Como é uma selfie, o texto e a placa podem aparecer invertidos em uma das versões.
Use a versão onde o texto/placa estiver legível (não espelhado) para extrair os dados.

Analise a foto de uma pessoa ao lado de um veículo e extraia:
1. Há uma pessoa claramente visível na foto?
2. Há um veículo visível na foto?
3. A placa do veículo está visível? Se sim, qual o texto da placa? (use a versão onde a placa está legível)
4. A foto parece autêntica (sem edição visível)?
5. A imagem original estava espelhada? (placa/texto invertidos na primeira imagem)

Responda APENAS em JSON:
{
  "pessoaVisivel": true,
  "veiculoVisivel": true,
  "placaVisivel": true,
  "placa": "...",
  "aparentementeAutentica": true,
  "imagemEspelhada": false
}`;

export async function validarSelfiePlaca(imageUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoSelfie;
}> {
  const dados = (await analisarImagemComEspelho(imageUrl, PROMPT)) as unknown as ResultadoSelfie;

  if (!dados.pessoaVisivel) {
    return { aprovado: false, motivo: 'Pessoa não visível na foto', dadosExtraidos: dados };
  }
  if (!dados.veiculoVisivel) {
    return { aprovado: false, motivo: 'Veículo não visível na foto', dadosExtraidos: dados };
  }
  if (!dados.aparentementeAutentica) {
    return { aprovado: false, motivo: 'Foto aparenta ter sido editada', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
