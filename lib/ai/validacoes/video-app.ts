import { analisarVideo } from '../gemini';
import type { ResultadoVideoApp } from '@/types/documentos';

const PROMPT = `Analise este vídeo de gravação de tela de um aplicativo de transporte/entrega e extraia:
1. Nome do perfil visível no app
2. Placa do veículo (se visível no app)
3. Faturamento dos últimos 180 dias (se visível)
4. Tempo de uso/cadastro no app (se visível)
5. Total de corridas/entregas (se visível)
6. Qual aplicativo está sendo mostrado?
7. O vídeo apresenta sinais de adulteração ou edição maliciosa?

IMPORTANTE sobre cortes/transições:
- Este é um vídeo de GRAVAÇÃO DE TELA. O usuário navega entre telas, abas e aplicativos diferentes durante a gravação.
- Transições naturais de navegação (trocar de tela, abrir menu, scroll, mudar de app, voltar para home) NÃO são cortes nem edição.
- Considere "temCortes" como true APENAS se houver sinais claros de adulteração: saltos bruscos no tempo, frames inseridos de outra gravação, sobreposição de imagens editadas, ou alteração visível de dados/valores na tela.

Responda APENAS em JSON:
{
  "nomePerfil": "...",
  "placa": "...",
  "faturamento180d": "...",
  "tempoUso": "...",
  "totalCorridas": "...",
  "temCortes": false,
  "motivoCortes": null,
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
