import { analisarImagem } from '../gemini';
import type { ResultadoSelfie } from '@/types/documentos';

const PROMPT = `Analise esta foto de uma pessoa ao lado de um veículo e extraia:
1. Há uma pessoa claramente visível na foto?
2. Há um veículo visível na foto?
3. A placa do veículo está visível? Se sim, qual o texto da placa?
4. A foto parece autêntica (sem edição visível)?

Responda APENAS em JSON:
{
  "pessoaVisivel": true,
  "veiculoVisivel": true,
  "placaVisivel": true,
  "placa": "...",
  "aparentementeAutentica": true
}`;

export async function validarSelfiePlaca(imageUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoSelfie;
}> {
  const dados = (await analisarImagem(imageUrl, PROMPT)) as unknown as ResultadoSelfie;

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
