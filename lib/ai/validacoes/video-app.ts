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
8. O vídeo mostra os ganhos em formato MENSAL (mês a mês)? Ou apenas diário/semanal/total?
9. Extraia os ganhos mês a mês dos últimos 6 meses: [{"mes": "YYYY-MM", "valor": 3800}, ...].
   Se ganhos estiverem em formato diário, semanal ou apenas total: retorne formatoGanhos = "invalido".
   Se não identificado: retorne formatoGanhos = "nao_identificado".
10. A foto do perfil do candidato aparece visível no vídeo?

IMPORTANTE sobre cortes/transições:
- Este é um vídeo de GRAVAÇÃO DE TELA ou outro celular gravando uma tela. O usuário navega entre telas, abas e aplicativos diferentes durante a gravação.
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
  "aplicativo": "...",
  "ganhosMensais": [{"mes": "YYYY-MM", "valor": 3800}],
  "formatoGanhos": "mensal",
  "fotoPerfilVisivel": true
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

  if (dados.formatoGanhos === 'invalido') {
    return {
      aprovado: false,
      motivo: 'Ganhos não estão no formato mensal. Mostre mês a mês — não envie ganhos diários ou semanais.',
      dadosExtraidos: dados,
    };
  }

  if (dados.ganhosMensais && Array.isArray(dados.ganhosMensais)) {
    if (dados.ganhosMensais.length < 6) {
      return {
        aprovado: false,
        motivo: 'Vídeo não mostra os ganhos dos últimos 6 meses completos.',
        dadosExtraidos: dados,
      };
    }
    const LIMITE = 3500;
    // Ordena do mês mais antigo para o mais recente ("YYYY-MM")
    const meses = [...dados.ganhosMensais].sort((a, b) => a.mes.localeCompare(b.mes));

    const seisMesesOk = meses.every((g) => g.valor >= LIMITE);
    const tresMesesOk = meses.slice(-3).every((g) => g.valor >= LIMITE);

    // Aprova se os 6 meses estão >= 3.5k; senão, tenta aprovar pelos últimos 3 meses.
    if (!seisMesesOk && !tresMesesOk) {
      return {
        aprovado: false,
        motivo: 'Faturamento abaixo de R$ 3.500: nem os últimos 6 meses, nem os últimos 3 meses atingiram o mínimo.',
        dadosExtraidos: dados,
      };
    }
  }

  return { aprovado: true, motivo: null, dadosExtraidos: dados };
}
