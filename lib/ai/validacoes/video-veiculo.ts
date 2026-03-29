import { analisarVideo } from '../gemini';
import type { ResultadoVideoVeiculo } from '@/types/documentos';

const PROMPT = `Analise este vídeo de um veículo e extraia:
1. O veículo aparenta estar ligado (painel aceso, motor funcionando)?
2. A placa do veículo está visível? Se sim, qual o texto?
3. O vídeo apresenta cortes ou edição visível?

Responda APENAS em JSON:
{
  "veiculoLigado": true,
  "placaVisivel": true,
  "placa": "...",
  "temCortes": false
}`;

export async function validarVideoVeiculo(videoUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoVideoVeiculo;
}> {
  const dados = (await analisarVideo(videoUrl, PROMPT)) as unknown as ResultadoVideoVeiculo;

  if (!dados.veiculoLigado) {
    return { aprovado: false, motivo: 'Veículo não aparenta estar ligado', dadosExtraidos: dados };
  }
  if (dados.temCortes) {
    return { aprovado: false, motivo: 'Vídeo apresenta cortes ou edição', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
