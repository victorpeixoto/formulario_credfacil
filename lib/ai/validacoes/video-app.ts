import { analisarVideo } from '../gemini';
import type { ResultadoVideoApp } from '@/types/documentos';

const PROMPT = `Analise este vídeo da tela de um aplicativo de transporte/entrega e extraia:
1. Nome do perfil visível no app
2. Placa do veículo (se visível no app)
3. Faturamento dos últimos 180 dias (se visível)
4. Tempo de uso/cadastro no app (se visível)
5. Total de corridas/entregas (se visível)
6. O vídeo apresenta cortes ou edição visível?
7. Qual aplicativo está sendo mostrado?

Responda APENAS em JSON:
{
  "nomePerfil": "...",
  "placa": "...",
  "faturamento180d": "...",
  "tempoUso": "...",
  "totalCorridas": "...",
  "temCortes": false,
  "aplicativo": "..."
}`;

export async function validarVideoApp(videoUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoVideoApp;
}> {
  const dados = (await analisarVideo(videoUrl, PROMPT)) as unknown as ResultadoVideoApp;

  if (dados.temCortes) {
    return { aprovado: false, motivo: 'Vídeo apresenta cortes ou edição', dadosExtraidos: dados };
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
